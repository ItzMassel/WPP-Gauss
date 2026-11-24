import {createHash, randomBytes, scrypt, timingSafeEqual} from 'node:crypto'
import type {NextFunction, Request, Response} from 'express'
import {pool} from './db.js'

export const COOKIE = 'gauss_session'
const SESSION_DAYS = 30

export interface AuthedUser {
  id: string
  username: string
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthedUser
  }
}

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 64, {N: 16384, r: 8, p: 1}, (err, key) => (err ? reject(err) : resolve(key))),
  )
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scryptAsync(password, salt)
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, key] = stored.split('$')
  if (scheme !== 'scrypt' || !salt || !key) return false
  const expected = Buffer.from(key, 'base64')
  const actual = await scryptAsync(password, Buffer.from(salt, 'base64'))
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

const sha256 = (value: string) => createHash('sha256').update(value).digest()

function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim())
  }
  return undefined
}

export async function createSession(res: Response, userId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url')
  await pool.query(
    `INSERT INTO sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, now() + make_interval(days => $3))`,
    [sha256(token), userId, SESSION_DAYS],
  )
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE !== 'false',
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  })
}

export async function destroySession(req: Request, res: Response): Promise<void> {
  const token = readCookie(req, COOKIE)
  if (token) await pool.query('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)])
  res.clearCookie(COOKIE, {path: '/'})
}

/** Attaches req.user when a valid session cookie is present. */
export async function loadUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = readCookie(req, COOKIE)
    if (token) {
      const {rows} = await pool.query<AuthedUser>(
        `SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > now()`,
        [sha256(token)],
      )
      req.user = rows[0]
    }
    next()
  } catch (err) {
    next(err)
  }
}

export function requireUser(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({error: 'Bitte melde dich an.'})
    return
  }
  next()
}
