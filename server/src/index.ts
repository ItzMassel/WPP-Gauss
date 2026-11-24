import express, {type NextFunction, type Request, type Response} from 'express'
import {createSession, destroySession, hashPassword, loadUser, requireUser, verifyPassword} from './auth.js'
import {pool} from './db.js'
import {rateLimit} from './ratelimit.js'
import {DAILY_REPEATABLE_CAP, SOURCES} from './rules.js'

const app = express()
app.set('trust proxy', 1) // behind nginx
app.disable('x-powered-by')
app.use(express.json({limit: '10kb'}))
app.use(loadUser)

const authLimit = rateLimit(10, 60_000)

const USERNAME_RE = /^[\p{L}\p{N}_-]{3,24}$/u
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const str = (v: unknown) => (typeof v === 'string' ? v : '')

async function totalPoints(userId: string): Promise<number> {
  const {rows} = await pool.query<{total_points: number}>(
    'SELECT total_points FROM user_points WHERE user_id = $1',
    [userId],
  )
  return rows[0]?.total_points ?? 0
}

app.get('/api/health', (_req, res) => {
  res.json({ok: true})
})

app.post('/api/register', authLimit, async (req, res) => {
  const username = str(req.body?.username).trim()
  const email = str(req.body?.email).trim()
  const password = str(req.body?.password)

  if (!USERNAME_RE.test(username)) {
    res.status(400).json({error: 'Der Benutzername muss 3–24 Zeichen lang sein (Buchstaben, Zahlen, _ und -).'})
    return
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    res.status(400).json({error: 'Bitte gib eine gültige E-Mail-Adresse ein.'})
    return
  }
  if (password.length < 8 || password.length > 200) {
    res.status(400).json({error: 'Das Passwort muss mindestens 8 Zeichen lang sein.'})
    return
  }

  try {
    const {rows} = await pool.query<{id: string}>(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [username, email, await hashPassword(password)],
    )
    await createSession(res, rows[0].id)
    res.status(201).json({user: {id: rows[0].id, username}, totalPoints: 0})
  } catch (err) {
    if ((err as {code?: string}).code === '23505') {
      res.status(409).json({error: 'Benutzername oder E-Mail ist bereits vergeben.'})
      return
    }
    throw err
  }
})

app.post('/api/login', authLimit, async (req, res) => {
  const login = str(req.body?.login).trim()
  const password = str(req.body?.password)

  const {rows} = await pool.query<{id: string; username: string; password_hash: string}>(
    'SELECT id, username, password_hash FROM users WHERE lower(username) = lower($1) OR lower(email) = lower($1)',
    [login],
  )
  const user = rows[0]
  // Always run a hash comparison so response time doesn't reveal whether the account exists.
  const ok = await verifyPassword(password, user?.password_hash ?? 'scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AAAA')
  if (!user || !ok) {
    res.status(401).json({error: 'Benutzername oder Passwort ist falsch.'})
    return
  }
  await createSession(res, user.id)
  res.json({user: {id: user.id, username: user.username}, totalPoints: await totalPoints(user.id)})
})

app.post('/api/logout', async (req, res) => {
  await destroySession(req, res)
  res.json({ok: true})
})

app.get('/api/me', requireUser, async (req, res) => {
  const user = req.user!
  res.json({user, totalPoints: await totalPoints(user.id)})
})

/** When the user may collect points for this source + ref again (null = now). */
async function cooldownEnd(userId: string, source: string, sourceRef: string | null): Promise<Date | null> {
  const hours = SOURCES[source]?.cooldownHours
  if (!hours || !sourceRef) return null
  const {rows} = await pool.query<{available_at: Date}>(
    `SELECT max(created_at) + make_interval(hours => $4) AS available_at FROM point_events
     WHERE user_id = $1 AND source = $2 AND source_ref = $3`,
    [userId, source, sourceRef, hours],
  )
  const at = rows[0]?.available_at
  return at && at.getTime() > Date.now() ? at : null
}

app.get('/api/cooldown', requireUser, async (req, res) => {
  const source = str(req.query.source)
  const sourceRef = str(req.query.sourceRef).slice(0, 200) || null
  const at = await cooldownEnd(req.user!.id, source, sourceRef)
  res.json({availableAt: at ? at.toISOString() : null})
})

app.post('/api/points', requireUser, async (req, res) => {
  const user = req.user!
  const source = str(req.body?.source)
  const sourceRef = str(req.body?.sourceRef).slice(0, 200) || null
  const points = req.body?.points

  const rule = SOURCES[source]
  if (!rule) {
    res.status(400).json({error: 'Unbekannte Punktequelle.'})
    return
  }
  if (!Number.isInteger(points) || points < 1 || points > rule.maxPerAward) {
    res.status(400).json({error: 'Ungültige Punktzahl.'})
    return
  }
  if ((rule.once || rule.cooldownHours) && !sourceRef) {
    res.status(400).json({error: 'sourceRef fehlt.'})
    return
  }

  if (await cooldownEnd(user.id, source, sourceRef)) {
    res.json({awarded: 0, totalPoints: await totalPoints(user.id)})
    return
  }

  if (!rule.once && !rule.cooldownHours) {
    const {rows} = await pool.query<{earned: number}>(
      `SELECT COALESCE(SUM(points), 0)::integer AS earned FROM point_events
       WHERE user_id = $1 AND created_at > now() - interval '24 hours'
         AND source = ANY($2::text[])`,
      [user.id, Object.keys(SOURCES).filter((s) => !SOURCES[s].once && !SOURCES[s].cooldownHours)],
    )
    if (rows[0].earned + points > DAILY_REPEATABLE_CAP) {
      res.status(429).json({error: 'Tageslimit für Gauß-Punkte erreicht.'})
      return
    }
  }

  const {rowCount} = await pool.query(
    `INSERT INTO point_events (user_id, points, source, source_ref) VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING`,
    [user.id, points, source, sourceRef],
  )
  res.json({awarded: rowCount === 1 ? points : 0, totalPoints: await totalPoints(user.id)})
})

app.get('/api/leaderboard', async (req, res) => {
  const ranked = `SELECT user_id, username, total_points,
                         RANK() OVER (ORDER BY total_points DESC)::integer AS rank
                  FROM user_points WHERE total_points > 0`

  const {rows} = await pool.query(
    `WITH ranked AS (${ranked})
     SELECT username, total_points AS "totalPoints", rank FROM ranked
     ORDER BY total_points DESC, username LIMIT 20`,
  )

  // The signed-in user's own position, so it shows even outside the top 20.
  let me: {username: string; totalPoints: number; rank: number | null} | null = null
  if (req.user) {
    const own = await pool.query<{totalPoints: number; rank: number}>(
      `WITH ranked AS (${ranked})
       SELECT total_points AS "totalPoints", rank FROM ranked WHERE user_id = $1`,
      [req.user.id],
    )
    me = own.rows[0]
      ? {username: req.user.username, ...own.rows[0]}
      : {username: req.user.username, totalPoints: 0, rank: null}
  }

  res.json({leaderboard: rows, me})
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({error: 'Interner Fehler.'})
})

const port = Number(process.env.PORT ?? 3010)
app.listen(port, '127.0.0.1', () => console.log(`gauss api listening on 127.0.0.1:${port}`))
