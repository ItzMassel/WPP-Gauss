import {useState, type FormEvent} from 'react'
import {useNavigate} from 'react-router-dom'
import {useAuth} from '../auth/AuthContext'

const S = {
  display: {fontFamily: "'Playfair Display', Georgia, serif"} as const,
  accent: {color: 'var(--color-accent)'} as const,
  muted: {color: 'var(--color-textMuted)'} as const,
}

const inputStyle = {
  width: '100%',
  background: 'var(--color-background)',
  border: '1px solid var(--color-border)',
  borderRadius: '2px',
  color: 'var(--color-text)',
  padding: '0.75rem 0.9rem',
  fontSize: '0.95rem',
  outline: 'none',
} as const

const labelStyle = {
  display: 'block',
  fontSize: '0.62rem',
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  marginBottom: '0.4rem',
  ...S.muted,
} as const

export default function AuthPage() {
  const navigate = useNavigate()
  const {user, login, register, logout} = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') await login(name, password)
      else await register(name, email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Etwas ist schiefgelaufen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{minHeight: '100vh', background: 'var(--color-background)', display: 'flex', flexDirection: 'column'}}>
      <nav style={{borderBottom: '1px solid var(--color-border)', padding: '1.1rem 3rem'}}>
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
      </nav>

      <main style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem'}}>
        <div style={{width: '100%', maxWidth: '24rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '1.25rem'}}>
            <div style={{width: '2.5rem', height: '1px', background: 'var(--color-accent)'}} />
            <span style={{fontSize: '0.62rem', letterSpacing: '0.28em', textTransform: 'uppercase', ...S.accent}}>
              Konto
            </span>
          </div>

          {user ? (
            <>
              <h1 style={{...S.display, fontSize: '2.4rem', fontWeight: 900, lineHeight: 1, marginBottom: '1rem'}}>
                Hallo, <em style={{fontStyle: 'italic', ...S.accent}}>{user.username}</em>
              </h1>
              <p style={{...S.muted, marginBottom: '1.75rem'}}>Du bist angemeldet.</p>
              <button
                className="btn-outline"
                onClick={async () => {
                  await logout()
                  navigate('/')
                }}
              >
                Abmelden
              </button>
            </>
          ) : (
            <>
              <h1 style={{...S.display, fontSize: '2.4rem', fontWeight: 900, lineHeight: 1, marginBottom: '1.75rem'}}>
                {mode === 'login' ? (
                  <>
                    Willkommen <em style={{fontStyle: 'italic', ...S.accent}}>zurück</em>
                  </>
                ) : (
                  <>
                    Konto <em style={{fontStyle: 'italic', ...S.accent}}>erstellen</em>
                  </>
                )}
              </h1>

              <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.1rem'}}>
                <div>
                  <label style={labelStyle} htmlFor="name">
                    {mode === 'login' ? 'Benutzername oder E-Mail' : 'Benutzername'}
                  </label>
                  <input
                    id="name"
                    style={inputStyle}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
                {mode === 'register' && (
                  <div>
                    <label style={labelStyle} htmlFor="email">
                      E-Mail
                    </label>
                    <input
                      id="email"
                      type="email"
                      style={inputStyle}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                )}
                <div>
                  <label style={labelStyle} htmlFor="password">
                    Passwort
                  </label>
                  <input
                    id="password"
                    type="password"
                    style={inputStyle}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    minLength={mode === 'register' ? 8 : undefined}
                    required
                  />
                  {mode === 'register' && (
                    <p style={{fontSize: '0.75rem', marginTop: '0.4rem', color: 'var(--color-textFaint)'}}>
                      Mindestens 8 Zeichen.
                    </p>
                  )}
                </div>

                {error && (
                  <p role="alert" style={{fontSize: '0.85rem', color: '#e0705f'}}>
                    {error}
                  </p>
                )}

                <button className="btn-primary" type="submit" disabled={busy} style={{marginTop: '0.4rem'}}>
                  {busy ? 'Einen Moment…' : mode === 'login' ? 'Anmelden' : 'Registrieren'}
                </button>
              </form>

              <p style={{marginTop: '1.5rem', fontSize: '0.85rem', ...S.muted}}>
                {mode === 'login' ? 'Noch kein Konto? ' : 'Schon registriert? '}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'login' ? 'register' : 'login')
                    setError('')
                  }}
                  style={{background: 'none', border: 'none', cursor: 'pointer', padding: 0, ...S.accent}}
                >
                  {mode === 'login' ? 'Jetzt registrieren' : 'Zur Anmeldung'}
                </button>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
