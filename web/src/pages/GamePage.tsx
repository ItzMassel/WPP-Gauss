import {useNavigate} from 'react-router-dom'
import GaussRunner from '../game/GaussRunner'

const S = {
  display: {fontFamily: "'Playfair Display', Georgia, serif"} as const,
  accent: {color: 'var(--color-accent)'} as const,
  muted: {color: 'var(--color-textMuted)'} as const,
}

export default function GamePage() {
  const navigate = useNavigate()

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
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            ...S.muted,
            fontSize: '0.72rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            padding: 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M5 12l7-7M5 12l7 7" />
          </svg>
          Startseite
        </button>
        <span style={{...S.display, fontSize: '1.35rem', fontWeight: 700, letterSpacing: '0.2em'}}>GAUSS</span>
        <div style={{width: '90px'}} />
      </nav>

      <section style={{padding: '3.5rem 3rem 1.5rem', maxWidth: '1000px', margin: '0 auto', textAlign: 'center'}}>
        <div
          style={{
            fontSize: '0.62rem',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            ...S.accent,
            marginBottom: '1rem',
          }}
        >
          Beta · Platzhaltergrafiken
        </div>
        <h1
          style={{
            ...S.display,
            fontSize: 'clamp(2.2rem, 4vw, 3.2rem)',
            fontWeight: 900,
            marginBottom: '0.75rem',
          }}
        >
          Der Gauß-Läufer
        </h1>
        <p style={{fontSize: '1rem', lineHeight: 1.75, ...S.muted, maxWidth: '50ch', margin: '0 auto'}}>
          Springe über Hindernisse und löse Matheaufgaben in den Portalen, um Gauß-Punkte zu sammeln.
        </p>
      </section>

      <section style={{padding: '1.5rem 3rem 6rem', display: 'flex', justifyContent: 'center'}}>
        <GaussRunner />
      </section>
    </div>
  )
}
