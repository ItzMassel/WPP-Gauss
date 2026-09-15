import {useEffect, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {client} from '../sanityClient'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

const S = {
  display: {fontFamily: "'Playfair Display', Georgia, serif"} as const,
  accent: {color: 'var(--color-accent)'} as const,
  muted: {color: 'var(--color-textMuted)'} as const,
  faint: {color: 'var(--color-textFaint)'} as const,
}

interface Lecture {
  _id: string
  title: string
  description?: string
  order?: number
  questionCount?: number
}

export default function QuizPage() {
  const navigate = useNavigate()
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client
      .fetch<Lecture[]>(`*[_type == "lecture"] | order(order asc) {
        _id, title, description, order,
        "questionCount": count(questions)
      }`)
      .then((data) => {
        setLectures(data ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div style={{minHeight: '100vh', background: 'var(--color-background)', overflowX: 'hidden'}}>
      {/* NAV */}
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
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M5 12l7-7M5 12l7 7" />
          </svg>
          Startseite
        </button>
        <span style={{...S.display, fontSize: '1.35rem', fontWeight: 700, letterSpacing: '0.2em'}}>
          GAUSS
        </span>
        <div style={{width: '90px'}} />
      </nav>

      {/* HEADER */}
      <section style={{padding: '5rem 3rem 2.5rem', maxWidth: '1100px', margin: '0 auto'}}>
        <div
          className="anim-fade-up d1"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.9rem',
            marginBottom: '1.75rem',
          }}
        >
          <div
            style={{width: '2.5rem', height: '1px', background: 'var(--color-accent)'}}
          />
          <span
            style={{
              fontSize: '0.62rem',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              ...S.accent,
            }}
          >
            Wissensüberprüfung
          </span>
        </div>

        <h1
          className="anim-fade-up d2"
          style={{
            ...S.display,
            fontSize: 'clamp(2.8rem, 5vw, 4.5rem)',
            fontWeight: 900,
            lineHeight: 0.92,
            letterSpacing: '-0.02em',
            marginBottom: '1.75rem',
          }}
        >
          Wähle eine
          <br />
          <em style={{fontStyle: 'italic', ...S.accent}}>Vorlesung</em>
        </h1>

        <p
          className="anim-fade-up d3"
          style={{fontSize: '1.05rem', lineHeight: 1.85, ...S.muted, maxWidth: '50ch'}}
        >
          Jede Vorlesung prüft ein Themengebiet aus Gauß' Werk. Bestehe den Quiz
          und verdiene <strong style={{color: 'var(--color-text)', fontWeight: 500}}>Gauß-Punkte</strong>.
        </p>
      </section>

      {/* LECTURE GRID */}
      <section style={{padding: '2rem 3rem 6rem', maxWidth: '1100px', margin: '0 auto'}}>
        {loading ? (
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem'}}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  height: '220px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '2px',
                  opacity: 0.35,
                }}
              />
            ))}
          </div>
        ) : lectures.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '6rem 0',
              border: '1px solid var(--color-border)',
              borderRadius: '2px',
            }}
          >
            <div
              style={{
                ...S.display,
                fontSize: '1.25rem',
                ...S.muted,
                marginBottom: '0.6rem',
                fontStyle: 'italic',
              }}
            >
              Noch keine Vorlesungen verfügbar.
            </div>
            <div style={{fontSize: '0.82rem', ...S.faint}}>
              Erstelle Vorlesungen im Sanity Studio und weise ihnen Fragen zu.
            </div>
          </div>
        ) : (
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem'}}>
            {lectures.map((lecture, i) => (
              <LectureCard
                key={lecture._id}
                lecture={lecture}
                roman={ROMAN[i] ?? String(i + 1)}
                delay={0.1 + i * 0.08}
                onClick={() => navigate(`/quiz/${lecture._id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function LectureCard({
  lecture,
  roman,
  delay,
  onClick,
}: {
  lecture: Lecture
  roman: string
  delay: number
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="anim-fade-up"
      style={{
        animationDelay: `${delay}s`,
        background: 'var(--color-surface)',
        border: `1px solid ${hovered ? 'rgba(201,168,76,0.35)' : 'var(--color-border)'}`,
        borderTop: '2px solid var(--color-accent)',
        borderRadius: '2px',
        padding: '2.5rem 2.25rem',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease',
        transform: hovered ? 'translateY(-5px)' : 'translateY(0)',
        boxShadow: hovered ? '0 20px 56px rgba(0,0,0,0.55)' : 'none',
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Ghost numeral background */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          right: '-0.5rem',
          bottom: '-1.5rem',
          fontSize: '9rem',
          lineHeight: 1,
          fontWeight: 900,
          fontFamily: "'Playfair Display', serif",
          color: `rgba(201,168,76,${hovered ? 0.1 : 0.05})`,
          userSelect: 'none',
          pointerEvents: 'none',
          transition: 'color 0.3s',
        }}
      >
        {roman}
      </div>

      <div
        style={{
          fontSize: '0.58rem',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: 'var(--color-accent)',
          opacity: 0.75,
          marginBottom: '1.1rem',
        }}
      >
        Vorlesung {roman}
      </div>

      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '1.5rem',
          fontWeight: 700,
          lineHeight: 1.15,
          marginBottom: lecture.description ? '0.85rem' : '2.25rem',
          color: hovered ? 'var(--color-accent)' : 'var(--color-text)',
          transition: 'color 0.2s',
        }}
      >
        {lecture.title}
      </h2>

      {lecture.description && (
        <p
          style={{
            fontSize: '0.95rem',
            lineHeight: 1.75,
            color: 'var(--color-textMuted)',
            marginBottom: '2.25rem',
            maxWidth: '34ch',
          }}
        >
          {lecture.description}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid var(--color-border)',
          paddingTop: '1.1rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.78rem',
            letterSpacing: '0.04em',
            color: 'var(--color-textFaint)',
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          {lecture.questionCount ?? 0}{' '}
          {lecture.questionCount === 1 ? 'Frage' : 'Fragen'}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.72rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: hovered ? 'var(--color-accent)' : 'var(--color-textMuted)',
            transition: 'color 0.2s, transform 0.2s',
            transform: hovered ? 'translateX(3px)' : 'translateX(0)',
          }}
        >
          Beginnen
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  )
}
