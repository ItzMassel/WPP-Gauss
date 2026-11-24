import {useEffect, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {api} from '../auth/api'
import {useAuth} from '../auth/AuthContext'

const S = {
  display: {fontFamily: "'Playfair Display', Georgia, serif"} as const,
  accent: {color: 'var(--color-accent)'} as const,
  muted: {color: 'var(--color-textMuted)'} as const,
  faint: {color: 'var(--color-textFaint)'} as const,
}

interface Entry {
  username: string
  totalPoints: number
  rank: number
}

interface Me {
  username: string
  totalPoints: number
  rank: number | null
}

interface LeaderboardResponse {
  leaderboard: Entry[]
  me: Me | null
}

const MEDALS: Record<number, string> = {1: 'I', 2: 'II', 3: 'III'}

function Row({entry, isMe}: {entry: Entry; isMe: boolean}) {
  const podium = entry.rank <= 3
  return (
    <li
      style={{
        display: 'grid',
        gridTemplateColumns: '3.5rem 1fr auto',
        alignItems: 'center',
        gap: '1rem',
        padding: podium ? '1.1rem 1.5rem' : '0.85rem 1.5rem',
        background: isMe ? 'rgba(201,168,76,0.08)' : 'var(--color-surface)',
        border: `1px solid ${isMe ? 'rgba(201,168,76,0.45)' : 'var(--color-border)'}`,
        borderLeft: `3px solid ${podium || isMe ? 'var(--color-accent)' : 'var(--color-border)'}`,
        borderRadius: '2px',
      }}
    >
      <span
        style={{
          ...S.display,
          fontSize: podium ? '1.6rem' : '1.05rem',
          fontWeight: 900,
          ...(podium ? S.accent : S.muted),
        }}
      >
        {podium ? MEDALS[entry.rank] : entry.rank}
      </span>
      <span
        style={{
          fontSize: podium ? '1.15rem' : '1rem',
          fontWeight: isMe ? 600 : 400,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {entry.username}
        {isMe && <span style={{...S.accent, fontSize: '0.75rem', marginLeft: '0.6rem'}}>(du)</span>}
      </span>
      <span style={{...S.display, fontWeight: 700, ...S.accent, fontSize: podium ? '1.2rem' : '1rem'}}>
        {entry.totalPoints.toLocaleString('de-DE')}
        <span style={{...S.muted, fontFamily: 'inherit', fontWeight: 400, fontSize: '0.75rem', marginLeft: '0.4rem'}}>
          Punkte
        </span>
      </span>
    </li>
  )
}

export default function LeaderboardPage() {
  const navigate = useNavigate()
  const {user, totalPoints} = useAuth()
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [error, setError] = useState('')

  // Reload when the signed-in user or their points change so "du" stays current.
  useEffect(() => {
    api<LeaderboardResponse>('/leaderboard')
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen.'))
  }, [user?.id, totalPoints])

  const entries = data?.leaderboard ?? []
  const me = data?.me ?? null
  const meInList = me !== null && entries.some((e) => e.username === me.username)

  return (
    <div style={{minHeight: '100vh', background: 'var(--color-background)', overflowX: 'hidden'}}>
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          borderBottom: '1px solid var(--color-border)',
          background: 'rgba(13,17,23,0.88)',
          backdropFilter: 'blur(12px)',
          padding: '1.1rem 3rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            ...S.muted,
            fontSize: '0.72rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            padding: 0,
          }}
        >
          ← Startseite
        </button>
        <span style={{...S.display, fontSize: '1.35rem', fontWeight: 700, letterSpacing: '0.2em'}}>GAUSS</span>
        <span style={{width: '5rem'}} />
      </nav>

      <main style={{maxWidth: '44rem', margin: '0 auto', padding: '4rem 1.5rem 5rem'}}>
        <div className="anim-fade-up d1" style={{display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '1.25rem'}}>
          <div style={{width: '2.5rem', height: '1px', background: 'var(--color-accent)'}} />
          <span style={{fontSize: '0.62rem', letterSpacing: '0.28em', textTransform: 'uppercase', ...S.accent}}>
            Rangliste
          </span>
        </div>

        <h1
          className="anim-fade-up d2"
          style={{...S.display, fontSize: 'clamp(2.4rem, 5vw, 3.6rem)', fontWeight: 900, lineHeight: 1, marginBottom: '1rem'}}
        >
          Die besten <em style={{fontStyle: 'italic', ...S.accent}}>Schüler</em>
        </h1>
        <p className="anim-fade-up d3" style={{...S.muted, lineHeight: 1.8, marginBottom: '2.5rem', maxWidth: '44ch'}}>
          Wer hat die meisten Gauß-Punkte gesammelt? Die Top 20 im Überblick.
        </p>

        {error && (
          <p role="alert" style={{fontSize: '0.9rem', color: '#e0705f'}}>
            {error}
          </p>
        )}

        {!data && !error && <p style={S.faint}>Wird geladen…</p>}

        {data && entries.length === 0 && (
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              padding: '2.5rem 2rem',
              textAlign: 'center',
              borderRadius: '2px',
            }}
          >
            <p style={{...S.muted, marginBottom: '1.5rem'}}>
              Noch hat niemand Punkte gesammelt. Sei der Erste!
            </p>
            <button className="btn-primary" onClick={() => navigate('/quiz')}>
              Jetzt lernen
            </button>
          </div>
        )}

        {entries.length > 0 && (
          <ol className="anim-fade-up d4" style={{listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
            {entries.map((entry) => (
              <Row key={entry.username} entry={entry} isMe={me?.username === entry.username} />
            ))}
          </ol>
        )}

        {/* Own position when outside the top 20 */}
        {data && me && !meInList && (
          <>
            <div style={{textAlign: 'center', ...S.faint, letterSpacing: '0.3em', margin: '0.6rem 0'}}>···</div>
            {me.rank !== null ? (
              <ol style={{listStyle: 'none'}}>
                <Row entry={{username: me.username, totalPoints: me.totalPoints, rank: me.rank}} isMe />
              </ol>
            ) : (
              <p style={{...S.muted, textAlign: 'center', fontSize: '0.95rem'}}>
                Sammle deine ersten Gauß-Punkte, um in der Rangliste zu erscheinen.
              </p>
            )}
          </>
        )}

        {data && !user && (
          <p style={{marginTop: '2.5rem', textAlign: 'center', fontSize: '0.9rem', ...S.muted}}>
            <button
              onClick={() => navigate('/anmelden')}
              style={{background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 'inherit', ...S.accent}}
            >
              Melde dich an
            </button>
            , um selbst in der Rangliste aufzusteigen.
          </p>
        )}
      </main>
    </div>
  )
}
