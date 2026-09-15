import {useNavigate} from 'react-router-dom'

const S = {
  display: { fontFamily: "'Playfair Display', Georgia, serif" } as const,
  accent:  { color: 'var(--color-accent)' } as const,
  muted:   { color: 'var(--color-textMuted)' } as const,
  faint:   { color: 'var(--color-textFaint)' } as const,
  border:  { border: '1px solid var(--color-border)' } as const,
}

function GoldRule({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 3rem', margin: '4rem 0' }}>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, var(--color-border))' }} />
      <span style={{ padding: '0 1.5rem', fontSize: '0.6rem', letterSpacing: '0.25em', textTransform: 'uppercase', ...S.accent, opacity: 0.5 }}>{label}</span>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, var(--color-border))' }} />
    </div>
  )
}

const features = [
  {
    num: '01',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
    title: 'Quizze',
    desc: 'Teste dein Wissen über Gauß und seine mathematischen Entdeckungen. Interaktive Fragen in verschiedenen Schwierigkeitsstufen warten auf dich.',
    badge: 'Verfügbar',
    active: true,
  },
  {
    num: '02',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    ),
    title: 'Lehrvideos',
    desc: 'Erlebe die Welt der Mathematik durch sorgfältig produzierte Videos — vom Leben des Meisters bis zu seinen größten Entdeckungen.',
    badge: 'Demnächst',
    active: false,
  },
  {
    num: '03',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
      </svg>
    ),
    title: 'Vorlesungen',
    desc: 'Tauche tief ein in Gauß\'s bahnbrechende Theorien mit geführten, interaktiven Lerneinheiten — Mathematik zum Anfassen.',
    badge: 'Demnächst',
    active: false,
  },
]

const points = [
  { pts: '10',  label: 'Quiz bestanden' },
  { pts: '25',  label: 'Thema gemeistert' },
  { pts: '50',  label: 'Perfekte Wertung' },
  { pts: '100', label: 'Woche vollendet' },
]

export default function App() {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden', background: 'var(--color-background)' }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        borderBottom: '1px solid var(--color-border)',
        background: 'rgba(13,17,23,0.85)',
        backdropFilter: 'blur(12px)',
        padding: '1.1rem 3rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', ...S.muted }}>
          WPP Gauß 2026/27
        </span>
        <span style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '0.2em', ...S.display }}>
          GAUSS
        </span>
        <button className="btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.7rem' }}>
          Anmelden
        </button>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        minHeight: 'calc(100vh - 56px)',
        overflow: 'hidden',
      }}>

        {/* Text side */}
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '5rem 4.5rem 5rem 5rem',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Ghost numeral */}
          <div aria-hidden style={{
            position: 'absolute', right: '-1rem', bottom: '-3rem',
            fontSize: '22rem', lineHeight: 1,
            fontWeight: 900, ...S.display,
            color: 'rgba(201,168,76,0.04)',
            userSelect: 'none', pointerEvents: 'none',
          }}>
            I
          </div>

          {/* Label */}
          <div className="anim-fade-up d2" style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '1.75rem' }}>
            <div style={{ width: '2.5rem', height: '1px', background: 'var(--color-accent)' }} />
            <span style={{ fontSize: '0.62rem', letterSpacing: '0.28em', textTransform: 'uppercase', ...S.accent }}>
              Princeps Mathematicorum
            </span>
          </div>

          {/* Main heading */}
          <h1 className="anim-fade-up d3" style={{
            ...S.display,
            fontSize: 'clamp(3.5rem, 6.5vw, 6.5rem)',
            fontWeight: 900, lineHeight: 0.92,
            letterSpacing: '-0.02em',
            marginBottom: '1.75rem',
          }}>
            Lerne mit<br />
            dem <em style={{ fontStyle: 'italic', ...S.accent }}>Fürsten</em><br />
            der Mathematik
          </h1>

          {/* Gold rule */}
          <div className="anim-fade-up d3" style={{ width: '3.5rem', height: '1px', background: 'var(--color-accent)', opacity: 0.55, marginBottom: '1.75rem' }} />

          {/* Body */}
          <p className="anim-fade-up d4" style={{
            fontSize: '1.1rem', lineHeight: 1.85,
            ...S.muted, maxWidth: '38ch', marginBottom: '2.5rem',
          }}>
            Er heißt wirklich so - könnt ihr googlen! Verdiene <strong style={{ color: 'var(--color-text)', fontWeight: 500 }}>Gauß-Punkte</strong> und meistere die Mathematik.
          </p>

          {/* CTAs */}
          <div className="anim-fade-up d5" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2.75rem', flexWrap: 'wrap' }}>
            <button className="btn-primary" onClick={() => navigate('/quiz')}>Jetzt lernen</button>
            <span style={{ fontSize: '0.82rem', ...S.muted, letterSpacing: '0.03em' }}>
              Kostenlos · Keine Anmeldung nötig
            </span>
          </div>

          {/* Gauß-Punkte badge */}
          <div className="anim-fade-up d6" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.8rem',
            padding: '0.85rem 1.35rem',
            border: '1px solid rgba(201,168,76,0.22)',
            background: 'rgba(26,58,92,0.18)',
            borderRadius: '3px', width: 'fit-content',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
            </svg>
            <span style={{ fontSize: '0.82rem', ...S.muted, letterSpacing: '0.04em' }}>
              Verdiene{' '}
              <strong style={{ ...S.accent, fontWeight: 600 }}>Gauß-Punkte</strong>
              {' '}für jede abgeschlossene Aufgabe
            </span>
          </div>
        </div>

        {/* Portrait side */}
        <div className="anim-scale-in d1" style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
          <img
            src="/Gauss-Bild.png"
            alt="Carl Friedrich Gauß"
            style={{
              height: '115%',
              width: 'auto',
              objectFit: 'contain',
              objectPosition: 'top center',
              display: 'block',
              position: 'relative', zIndex: 1,
              filter: 'sepia(0.2) contrast(1.05) brightness(0.92)',
            }}
          />
          {/* Bottom fade into background */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'linear-gradient(to top, var(--color-background) 0%, transparent 18%)' }} />
          {/* Left edge blend */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, background: 'linear-gradient(to right, var(--color-background) 0%, transparent 18%)' }} />
          {/* Year badge */}
          <div style={{
            position: 'absolute', bottom: '2.5rem', right: '2rem', zIndex: 3,
            fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase',
            ...S.muted, borderRight: '2px solid var(--color-accent)',
            paddingRight: '0.75rem', textAlign: 'right',
          }}>
            1777 — 1855
          </div>
        </div>
      </section>

      <GoldRule label="II" />

      {/* ── FEATURES ── */}
      <section style={{ padding: '0 3rem 2rem', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', ...S.accent, marginBottom: '0.7rem' }}>
            Lernmaterialien
          </div>
          <h2 style={{ ...S.display, fontSize: 'clamp(1.8rem, 3.5vw, 2.75rem)', fontWeight: 700 }}>
            Was dich erwartet
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          {features.map((f, i) => (
            <div
              key={f.num}
              className={`card-hover anim-fade-up d${i + 2}`}
              style={{
                background: 'var(--color-surface)',
                border: `1px solid ${f.active ? 'rgba(201,168,76,0.35)' : 'var(--color-border)'}`,
                borderTop: `2px solid ${f.active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                padding: '2.25rem 2rem',
                borderRadius: '2px',
                position: 'relative',
                opacity: f.active ? 1 : 0.6,
              }}
            >
              {/* Badge */}
              <div style={{
                position: 'absolute', top: '1.5rem', right: '1.5rem',
                fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase',
                padding: '0.2rem 0.55rem',
                border: `1px solid ${f.active ? 'rgba(201,168,76,0.45)' : 'var(--color-border)'}`,
                color: f.active ? 'var(--color-accent)' : 'var(--color-textMuted)',
                borderRadius: '2px',
              }}>
                {f.badge}
              </div>

              <div style={{ fontSize: '0.6rem', letterSpacing: '0.18em', ...S.muted, marginBottom: '1.25rem' }}>{f.num}</div>
              <div style={{ color: f.active ? 'var(--color-accent)' : 'var(--color-textMuted)', marginBottom: '1.1rem' }}>
                {f.icon}
              </div>
              <h3 style={{ ...S.display, fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.7rem' }}>{f.title}</h3>
              <p style={{ fontSize: '0.95rem', lineHeight: 1.75, ...S.muted }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <GoldRule label="III" />

      {/* ── GAUSS-PUNKTE ── */}
      <section style={{ padding: '0 3rem 5rem', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderLeft: '3px solid var(--color-accent)',
          padding: '4rem',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center',
          borderRadius: '2px',
        }}>
          <div>
            <div style={{ fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', ...S.accent, marginBottom: '0.7rem' }}>
              Gamification
            </div>
            <h2 style={{ ...S.display, fontSize: 'clamp(1.6rem, 2.8vw, 2.4rem)', fontWeight: 700, marginBottom: '1.4rem', lineHeight: 1.1 }}>
              Gauß-Punkte sammeln<br />& aufsteigen
            </h2>
            <p style={{ fontSize: '1rem', lineHeight: 1.85, ...S.muted, marginBottom: '2rem', maxWidth: '38ch' }}>
              Jede beantwortete Frage, jedes abgeschlossene Quiz und jedes gemeisterte
              Thema bringt dir Punkte. Verfolge deinen Fortschritt und beweise,
              dass du ein würdiger Schüler des Princeps Mathematicorum bist.
            </p>
            <button className="btn-outline" onClick={() => navigate('/quiz')}>Jetzt lernen</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.9rem' }}>
            {points.map((p) => (
              <div key={p.label} style={{
                background: 'rgba(13,17,23,0.55)',
                border: '1px solid var(--color-border)',
                padding: '1.6rem 1rem',
                borderRadius: '2px', textAlign: 'center',
                transition: 'border-color 0.2s',
              }}>
                <div style={{ ...S.display, fontSize: '2.2rem', fontWeight: 900, ...S.accent, lineHeight: 1, marginBottom: '0.45rem' }}>
                  +{p.pts}
                </div>
                <div style={{ fontSize: '0.78rem', letterSpacing: '0.05em', ...S.muted }}>{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{
        borderTop: '1px solid var(--color-border)',
        padding: '2.5rem 3rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '1rem',
      }}>
        <div>
          <div style={{ ...S.display, fontSize: '1.05rem', fontWeight: 700, letterSpacing: '0.18em', marginBottom: '0.25rem' }}>
            GAUSS
          </div>
          <div style={{ fontSize: '0.72rem', letterSpacing: '0.06em', ...S.muted }}>
            WPP Gauß 2026/27
          </div>
        </div>
        <div style={{ fontSize: '0.72rem', letterSpacing: '0.06em', ...S.faint, textAlign: 'center' }}>
          Carl Friedrich Gauß · 30. April 1777 – 23. Februar 1855
        </div>
      </footer>

    </div>
  )
}
