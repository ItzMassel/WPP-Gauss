import {useEffect, useMemo, useRef, useState} from 'react'
import {useNavigate, useParams} from 'react-router-dom'
import {client} from '../sanityClient'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SanityOption {
  _key: string
  label: string
  correct: boolean
}

interface SanityQuestion {
  _id: string
  question: string
  type: 'text' | 'multiplechoice' | 'sort' | 'guess' | 'yesno'
  options?: SanityOption[]
  sortItems?: string[]
  correctNumber?: number
  rangeMin?: number
  rangeMax?: number
  correctAnswer?: boolean
}

interface LectureWithQuestions {
  _id: string
  title: string
  questions: SanityQuestion[]
}

type Answer =
  | {type: 'multiplechoice'; selected: string[]; correct: boolean}
  | {type: 'yesno'; selected: boolean; correct: boolean}
  | {type: 'guess'; value: number; correct: boolean}
  | {type: 'sort'; order: string[]; correct: boolean}
  | {type: 'text'; value: string; correct: true}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S = {
  display: {fontFamily: "'Playfair Display', Georgia, serif"} as const,
  accent: {color: 'var(--color-accent)'} as const,
  muted: {color: 'var(--color-textMuted)'} as const,
  faint: {color: 'var(--color-textFaint)'} as const,
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function scoreAnswer(q: SanityQuestion, raw: unknown): Answer {
  switch (q.type) {
    case 'multiplechoice': {
      const selected = raw as string[]
      const correctKeys = (q.options ?? []).filter((o) => o.correct).map((o) => o._key)
      const correct =
        correctKeys.length === selected.length &&
        correctKeys.every((k) => selected.includes(k))
      return {type: 'multiplechoice', selected, correct}
    }
    case 'yesno': {
      const selected = raw as boolean
      return {type: 'yesno', selected, correct: selected === q.correctAnswer}
    }
    case 'guess': {
      const value = raw as number
      const inRange =
        q.rangeMin !== undefined && q.rangeMax !== undefined
          ? value >= q.rangeMin && value <= q.rangeMax
          : value === q.correctNumber
      return {type: 'guess', value, correct: inRange}
    }
    case 'sort': {
      const order = raw as string[]
      const correct =
        q.sortItems !== undefined &&
        order.length === q.sortItems.length &&
        order.every((item, i) => item === q.sortItems![i])
      return {type: 'sort', order, correct}
    }
    case 'text':
      return {type: 'text', value: raw as string, correct: true}
  }
}

function calcPoints(answers: Answer[], questions: SanityQuestion[]): number {
  let pts = 0
  answers.forEach((a, i) => {
    if (questions[i]?.type === 'text') pts += 5
    else if (a.correct) pts += 10
  })
  const allScored = answers.filter((_, i) => questions[i]?.type !== 'text')
  if (allScored.length > 0 && allScored.every((a) => a.correct)) pts += 50
  return pts
}

function ratingText(score: number, total: number): {headline: string; sub: string} {
  if (total === 0) return {headline: 'Fertig', sub: ''}
  const pct = score / total
  if (pct === 1)
    return {headline: 'Exzellent', sub: 'Ein würdiger Schüler des Princeps Mathematicorum'}
  if (pct >= 0.8)
    return {headline: 'Ausgezeichnet', sub: 'Gauß wäre stolz auf dich'}
  if (pct >= 0.6)
    return {headline: 'Gut gemacht', sub: 'Weiter so — die Mathematik belohnt Ausdauer'}
  return {headline: 'Weiter üben', sub: 'Die größten Mathematiker scheiterten viele Male'}
}

// ─── Shuffle ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LecturePage() {
  const {lectureId} = useParams<{lectureId: string}>()
  const navigate = useNavigate()
  const [lecture, setLecture] = useState<LectureWithQuestions | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [currentRaw, setCurrentRaw] = useState<unknown>(null)
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(false)
  const questionKey = useRef(0)

  useEffect(() => {
    if (!lectureId) return
    client
      .fetch<LectureWithQuestions>(
        `*[_type == "lecture" && _id == $id][0] {
          _id, title,
          questions[]-> {
            _id, question, type,
            options[] { _key, label, correct },
            sortItems,
            correctNumber, rangeMin, rangeMax,
            correctAnswer
          }
        }`,
        {id: lectureId},
      )
      .then((data) => {
        setLecture(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [lectureId])

  const questions = lecture?.questions ?? []
  const currentQ = questions[currentIndex]
  const progress = questions.length > 0 ? (currentIndex / questions.length) * 100 : 0
  const finalProgress = done ? 100 : progress

  function handleCheck() {
    if (currentRaw === null && currentQ?.type !== 'text') return
    setRevealed(true)
  }

  function handleNext() {
    if (!currentQ) return
    const rawVal = currentRaw ?? ''
    const answer = scoreAnswer(currentQ, rawVal)
    const next = [...answers, answer]
    setAnswers(next)
    setRevealed(false)
    setCurrentRaw(null)
    questionKey.current++
    if (currentIndex + 1 >= questions.length) {
      setDone(true)
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

  function handleRestart() {
    setCurrentIndex(0)
    setAnswers([])
    setCurrentRaw(null)
    setRevealed(false)
    setDone(false)
    questionKey.current++
  }

  const scored = useMemo(
    () => answers.filter((_, i) => questions[i]?.type !== 'text'),
    [answers, questions],
  )
  const correctCount = scored.filter((a) => a.correct).length
  const points = calcPoints(answers, questions)

  return (
    <div style={{minHeight: '100vh', background: 'var(--color-background)', overflowX: 'hidden'}}>
      {/* Progress bar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'var(--color-border)',
          zIndex: 200,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${finalProgress}%`,
            background: 'var(--color-accent)',
            transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </div>

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
          onClick={() => navigate('/quiz')}
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
          Vorlesungen
        </button>

        <span style={{...S.display, fontSize: '1.35rem', fontWeight: 700, letterSpacing: '0.2em'}}>
          GAUSS
        </span>

        <div style={{fontSize: '0.72rem', letterSpacing: '0.1em', ...S.faint, textAlign: 'right'}}>
          {!done && questions.length > 0 && (
            <>
              Frage{' '}
              <span style={{color: 'var(--color-text)', fontWeight: 600}}>
                {currentIndex + 1}
              </span>
              {' '}von {questions.length}
            </>
          )}
        </div>
      </nav>

      {/* CONTENT */}
      <main style={{maxWidth: '760px', margin: '0 auto', padding: '4rem 2rem 6rem'}}>
        {loading && <LoadingState />}

        {!loading && !lecture && (
          <div style={{textAlign: 'center', padding: '5rem 0'}}>
            <p style={{...S.muted, fontSize: '1.1rem', fontStyle: 'italic', ...S.display}}>
              Vorlesung nicht gefunden.
            </p>
          </div>
        )}

        {!loading && lecture && !done && currentQ && (
          <QuestionView
            key={questionKey.current}
            question={currentQ}
            revealed={revealed}
            raw={currentRaw}
            onChange={setCurrentRaw}
            onCheck={handleCheck}
            onNext={handleNext}
            isLast={currentIndex + 1 >= questions.length}
          />
        )}

        {!loading && lecture && done && (
          <ResultsView
            lecture={lecture}
            correctCount={correctCount}
            totalScored={scored.length}
            points={points}
            answers={answers}
            questions={questions}
            onRestart={handleRestart}
            onBack={() => navigate('/quiz')}
          />
        )}
      </main>
    </div>
  )
}

// ─── Loading ──────────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '1.25rem'}}>
      {[180, 120, 56].map((h, i) => (
        <div
          key={i}
          style={{
            height: `${h}px`,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '2px',
            opacity: 0.4,
          }}
        />
      ))}
    </div>
  )
}

// ─── Question View ────────────────────────────────────────────────────────────

function QuestionView({
  question,
  revealed,
  raw,
  onChange,
  onCheck,
  onNext,
  isLast,
}: {
  question: SanityQuestion
  revealed: boolean
  raw: unknown
  onChange: (val: unknown) => void
  onCheck: () => void
  onNext: () => void
  isLast: boolean
}) {
  const canCheck = raw !== null || question.type === 'text'
  const currentAnswer = revealed ? scoreAnswer(question, raw ?? '') : null

  return (
    <div className="anim-fade-up d1">
      {/* Type badge */}
      <div
        style={{
          fontSize: '0.6rem',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          ...S.accent,
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <div style={{width: '1.8rem', height: '1px', background: 'var(--color-accent)'}} />
        {typeBadgeLabel(question.type)}
      </div>

      {/* Question */}
      <h2
        style={{
          ...S.display,
          fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)',
          fontWeight: 700,
          lineHeight: 1.2,
          marginBottom: '2.5rem',
          letterSpacing: '-0.01em',
        }}
      >
        {question.question}
      </h2>

      {/* Answer UI */}
      <div style={{marginBottom: '2.5rem'}}>
        {question.type === 'multiplechoice' && (
          <MultipleChoice
            options={question.options ?? []}
            selected={(raw as string[]) ?? []}
            revealed={revealed}
            onChange={onChange}
          />
        )}
        {question.type === 'yesno' && (
          <YesNo
            selected={raw as boolean | null}
            correctAnswer={question.correctAnswer}
            revealed={revealed}
            onChange={onChange}
          />
        )}
        {question.type === 'guess' && (
          <Guess
            value={raw as number | null}
            min={question.rangeMin}
            max={question.rangeMax}
            correct={question.correctNumber}
            revealed={revealed}
            onChange={onChange}
          />
        )}
        {question.type === 'sort' && (
          <Sort
            items={question.sortItems ?? []}
            order={(raw as string[]) ?? []}
            correctItems={question.sortItems ?? []}
            revealed={revealed}
            onChange={onChange}
          />
        )}
        {question.type === 'text' && (
          <TextAnswer
            value={(raw as string) ?? ''}
            onChange={(v) => onChange(v)}
          />
        )}
      </div>

      {/* Reveal feedback */}
      {revealed && currentAnswer && (
        <div
          className="anim-fade-up d1"
          style={{
            marginBottom: '2rem',
            padding: '1.1rem 1.4rem',
            borderRadius: '2px',
            border: `1px solid ${currentAnswer.correct ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.35)'}`,
            background: currentAnswer.correct
              ? 'rgba(74,222,128,0.06)'
              : 'rgba(248,113,113,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem',
          }}
        >
          <span style={{fontSize: '1.1rem'}}>{currentAnswer.correct ? '✓' : '✗'}</span>
          <span
            style={{
              fontSize: '0.92rem',
              color: currentAnswer.correct ? 'rgb(134,239,172)' : 'rgb(252,165,165)',
              letterSpacing: '0.02em',
            }}
          >
            {currentAnswer.correct
              ? question.type === 'text'
                ? 'Antwort gespeichert'
                : 'Richtig!'
              : feedbackText(question)}
          </span>
        </div>
      )}

      {/* Buttons */}
      <div style={{display: 'flex', gap: '1rem'}}>
        {!revealed ? (
          <button
            className="btn-primary"
            onClick={onCheck}
            disabled={!canCheck}
            style={{opacity: canCheck ? 1 : 0.4, cursor: canCheck ? 'pointer' : 'default'}}
          >
            Prüfen
          </button>
        ) : (
          <button className="btn-primary" onClick={onNext}>
            {isLast ? 'Ergebnis ansehen' : 'Weiter'}
          </button>
        )}
      </div>
    </div>
  )
}

function typeBadgeLabel(type: SanityQuestion['type']): string {
  const map: Record<SanityQuestion['type'], string> = {
    multiplechoice: 'Mehrfachwahl',
    yesno: 'Ja / Nein',
    guess: 'Schätzfrage',
    sort: 'Sortierung',
    text: 'Freitext',
  }
  return map[type]
}

function feedbackText(q: SanityQuestion): string {
  switch (q.type) {
    case 'multiplechoice':
      return 'Leider falsch — markierte Antworten zeigen die richtige Lösung.'
    case 'yesno':
      return `Leider falsch — die richtige Antwort ist ${q.correctAnswer ? 'Ja' : 'Nein'}.`
    case 'guess':
      if (q.rangeMin !== undefined && q.rangeMax !== undefined)
        return `Leider außerhalb — der richtige Bereich ist ${q.rangeMin} bis ${q.rangeMax}.`
      return `Leider falsch — die richtige Zahl ist ${q.correctNumber}.`
    case 'sort':
      return 'Leider falsch — die richtige Reihenfolge wird nun angezeigt.'
    default:
      return 'Leider falsch.'
  }
}

// ─── Multiple Choice ──────────────────────────────────────────────────────────

function MultipleChoice({
  options,
  selected,
  revealed,
  onChange,
}: {
  options: SanityOption[]
  selected: string[]
  revealed: boolean
  onChange: (v: string[]) => void
}) {
  function toggle(key: string) {
    if (revealed) return
    const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]
    onChange(next)
  }

  const multiCorrect = options.filter((o) => o.correct).length > 1

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
      {multiCorrect && (
        <p style={{fontSize: '0.8rem', ...S.faint, marginBottom: '0.25rem', letterSpacing: '0.04em'}}>
          Mehrere Antworten möglich
        </p>
      )}
      {options.map((opt) => {
        const isSelected = selected.includes(opt._key)
        const showCorrect = revealed && opt.correct
        const showWrong = revealed && isSelected && !opt.correct

        return (
          <button
            key={opt._key}
            onClick={() => toggle(opt._key)}
            style={{
              background: showCorrect
                ? 'rgba(74,222,128,0.08)'
                : showWrong
                  ? 'rgba(248,113,113,0.08)'
                  : isSelected
                    ? 'rgba(201,168,76,0.1)'
                    : 'var(--color-surface)',
              border: `1px solid ${
                showCorrect
                  ? 'rgba(74,222,128,0.5)'
                  : showWrong
                    ? 'rgba(248,113,113,0.5)'
                    : isSelected
                      ? 'rgba(201,168,76,0.5)'
                      : 'var(--color-border)'
              }`,
              borderRadius: '2px',
              padding: '1rem 1.25rem',
              textAlign: 'left',
              cursor: revealed ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              transition: 'border-color 0.2s, background 0.2s',
              color: 'var(--color-text)',
              fontFamily: "'EB Garamond', serif",
              fontSize: '1rem',
              lineHeight: 1.5,
            }}
          >
            <span
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '2px',
                border: `1px solid ${isSelected || showCorrect ? 'var(--color-accent)' : 'var(--color-border)'}`,
                background: isSelected ? 'var(--color-accent)' : 'transparent',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              {isSelected && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="#0D1117"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M1.5 5l2.5 2.5 4.5-4.5" />
                </svg>
              )}
              {showCorrect && !isSelected && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="rgb(134,239,172)"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M1.5 5l2.5 2.5 4.5-4.5" />
                </svg>
              )}
            </span>
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Yes / No ─────────────────────────────────────────────────────────────────

function YesNo({
  selected,
  correctAnswer,
  revealed,
  onChange,
}: {
  selected: boolean | null
  correctAnswer?: boolean
  revealed: boolean
  onChange: (v: boolean) => void
}) {
  const opts: {label: string; val: boolean}[] = [
    {label: 'Ja', val: true},
    {label: 'Nein', val: false},
  ]

  return (
    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
      {opts.map((opt) => {
        const isSelected = selected === opt.val
        const showCorrect = revealed && opt.val === correctAnswer
        const showWrong = revealed && isSelected && opt.val !== correctAnswer

        return (
          <button
            key={opt.label}
            onClick={() => !revealed && onChange(opt.val)}
            style={{
              padding: '2rem 1rem',
              borderRadius: '2px',
              border: `1px solid ${
                showCorrect
                  ? 'rgba(74,222,128,0.5)'
                  : showWrong
                    ? 'rgba(248,113,113,0.5)'
                    : isSelected
                      ? 'rgba(201,168,76,0.5)'
                      : 'var(--color-border)'
              }`,
              background: showCorrect
                ? 'rgba(74,222,128,0.08)'
                : showWrong
                  ? 'rgba(248,113,113,0.08)'
                  : isSelected
                    ? 'rgba(201,168,76,0.08)'
                    : 'var(--color-surface)',
              cursor: revealed ? 'default' : 'pointer',
              fontFamily: "'Playfair Display', serif",
              fontSize: '1.6rem',
              fontWeight: 700,
              color: showCorrect
                ? 'rgb(134,239,172)'
                : showWrong
                  ? 'rgb(252,165,165)'
                  : isSelected
                    ? 'var(--color-accent)'
                    : 'var(--color-textMuted)',
              transition: 'border-color 0.2s, background 0.2s, color 0.2s',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Guess ────────────────────────────────────────────────────────────────────

function Guess({
  value,
  min,
  max,
  correct,
  revealed,
  onChange,
}: {
  value: number | null
  min?: number
  max?: number
  correct?: number
  revealed: boolean
  onChange: (v: number) => void
}) {
  return (
    <div>
      {(min !== undefined || max !== undefined) && (
        <p style={{fontSize: '0.85rem', ...S.faint, marginBottom: '1rem', letterSpacing: '0.04em'}}>
          Schätze eine Zahl{' '}
          {min !== undefined && max !== undefined && (
            <>
              zwischen{' '}
              <strong style={{color: 'var(--color-text)'}}>
                {min}
              </strong>{' '}
              und{' '}
              <strong style={{color: 'var(--color-text)'}}>
                {max}
              </strong>
            </>
          )}
        </p>
      )}
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={revealed}
        placeholder="Deine Schätzung…"
        style={{
          width: '100%',
          padding: '1rem 1.25rem',
          background: 'var(--color-surface)',
          border: `1px solid ${
            revealed
              ? value !== null && value >= (min ?? correct ?? 0) && value <= (max ?? correct ?? 0)
                ? 'rgba(74,222,128,0.5)'
                : 'rgba(248,113,113,0.5)'
              : 'var(--color-border)'
          }`,
          borderRadius: '2px',
          color: 'var(--color-text)',
          fontFamily: "'EB Garamond', serif",
          fontSize: '1.1rem',
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
      />
      {revealed && correct !== undefined && (
        <p style={{marginTop: '0.6rem', fontSize: '0.85rem', color: 'rgb(134,239,172)'}}>
          Richtige Antwort: <strong>{correct}</strong>
          {min !== undefined && max !== undefined && ` (Bereich: ${min}–${max})`}
        </p>
      )}
    </div>
  )
}

// ─── Sort ─────────────────────────────────────────────────────────────────────

function Sort({
  items,
  order,
  correctItems,
  revealed,
  onChange,
}: {
  items: string[]
  order: string[]
  correctItems: string[]
  revealed: boolean
  onChange: (v: string[]) => void
}) {
  const shuffled = useMemo(() => shuffle(items), [items])
  const available = shuffled.filter((item) => !order.includes(item))

  function addItem(item: string) {
    if (revealed) return
    onChange([...order, item])
  }

  function removeItem(item: string) {
    if (revealed) return
    onChange(order.filter((i) => i !== item))
  }

  return (
    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
      {/* Available */}
      <div>
        <p
          style={{
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            ...S.faint,
            marginBottom: '0.75rem',
          }}
        >
          Verfügbar
        </p>
        <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: '60px'}}>
          {available.map((item) => (
            <button
              key={item}
              onClick={() => addItem(item)}
              style={{
                padding: '0.75rem 1rem',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '2px',
                textAlign: 'left',
                cursor: 'pointer',
                color: 'var(--color-textMuted)',
                fontFamily: "'EB Garamond', serif",
                fontSize: '0.95rem',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                ;(e.target as HTMLButtonElement).style.borderColor = 'rgba(201,168,76,0.4)'
                ;(e.target as HTMLButtonElement).style.color = 'var(--color-text)'
              }}
              onMouseLeave={(e) => {
                ;(e.target as HTMLButtonElement).style.borderColor = 'var(--color-border)'
                ;(e.target as HTMLButtonElement).style.color = 'var(--color-textMuted)'
              }}
            >
              {item}
            </button>
          ))}
          {available.length === 0 && !revealed && (
            <p style={{fontSize: '0.8rem', ...S.faint, fontStyle: 'italic', padding: '0.5rem 0'}}>
              Alle platziert
            </p>
          )}
        </div>
      </div>

      {/* Selected order */}
      <div>
        <p
          style={{
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            ...S.faint,
            marginBottom: '0.75rem',
          }}
        >
          Deine Reihenfolge
        </p>
        <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: '60px'}}>
          {order.map((item, i) => {
            const isCorrect = revealed && correctItems[i] === item
            const isWrong = revealed && correctItems[i] !== item

            return (
              <button
                key={item}
                onClick={() => removeItem(item)}
                style={{
                  padding: '0.75rem 1rem',
                  background: isCorrect
                    ? 'rgba(74,222,128,0.06)'
                    : isWrong
                      ? 'rgba(248,113,113,0.06)'
                      : 'rgba(201,168,76,0.06)',
                  border: `1px solid ${
                    isCorrect
                      ? 'rgba(74,222,128,0.4)'
                      : isWrong
                        ? 'rgba(248,113,113,0.4)'
                        : 'rgba(201,168,76,0.3)'
                  }`,
                  borderRadius: '2px',
                  textAlign: 'left',
                  cursor: revealed ? 'default' : 'pointer',
                  color: isCorrect
                    ? 'rgb(134,239,172)'
                    : isWrong
                      ? 'rgb(252,165,165)'
                      : 'var(--color-text)',
                  fontFamily: "'EB Garamond', serif",
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.65rem',
                    letterSpacing: '0.1em',
                    color: 'var(--color-accent)',
                    fontWeight: 600,
                    minWidth: '1rem',
                  }}
                >
                  {i + 1}.
                </span>
                {item}
              </button>
            )
          })}
          {order.length === 0 && (
            <p style={{fontSize: '0.8rem', ...S.faint, fontStyle: 'italic', padding: '0.5rem 0'}}>
              Klicke Elemente links an
            </p>
          )}
        </div>
        {revealed && (
          <div style={{marginTop: '1rem'}}>
            <p style={{fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', ...S.faint, marginBottom: '0.4rem'}}>
              Richtige Reihenfolge
            </p>
            {correctItems.map((item, i) => (
              <div key={item} style={{fontSize: '0.88rem', color: 'rgb(134,239,172)', lineHeight: 1.8}}>
                {i + 1}. {item}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Text Answer ──────────────────────────────────────────────────────────────

function TextAnswer({value, onChange}: {value: string; onChange: (v: string) => void}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Schreibe deine Antwort hier…"
      rows={4}
      style={{
        width: '100%',
        padding: '1rem 1.25rem',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '2px',
        color: 'var(--color-text)',
        fontFamily: "'EB Garamond', serif",
        fontSize: '1rem',
        lineHeight: 1.7,
        outline: 'none',
        resize: 'vertical',
        transition: 'border-color 0.2s',
      }}
      onFocus={(e) => {
        e.target.style.borderColor = 'rgba(201,168,76,0.4)'
      }}
      onBlur={(e) => {
        e.target.style.borderColor = 'var(--color-border)'
      }}
    />
  )
}

// ─── Results View ─────────────────────────────────────────────────────────────

function ResultsView({
  lecture,
  correctCount,
  totalScored,
  points,
  answers,
  questions,
  onRestart,
  onBack,
}: {
  lecture: LectureWithQuestions
  correctCount: number
  totalScored: number
  points: number
  answers: Answer[]
  questions: SanityQuestion[]
  onRestart: () => void
  onBack: () => void
}) {
  const rating = ratingText(correctCount, totalScored)

  return (
    <div className="anim-fade-up d1">
      {/* Certificate-style header */}
      <div
        style={{
          textAlign: 'center',
          padding: '3rem 2rem',
          border: '1px solid var(--color-border)',
          borderTop: '3px solid var(--color-accent)',
          background: 'var(--color-surface)',
          borderRadius: '2px',
          marginBottom: '2.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ghost star */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '14rem',
            color: 'rgba(201,168,76,0.04)',
            userSelect: 'none',
            pointerEvents: 'none',
            fontFamily: 'serif',
          }}
        >
          ★
        </div>

        <div
          style={{
            fontSize: '0.6rem',
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            ...S.accent,
            marginBottom: '1rem',
          }}
        >
          {lecture.title}
        </div>

        <h2
          style={{
            ...S.display,
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 900,
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
            marginBottom: '0.5rem',
          }}
        >
          {rating.headline}
        </h2>

        {rating.sub && (
          <p style={{fontSize: '0.95rem', fontStyle: 'italic', ...S.muted, marginBottom: '2rem'}}>
            {rating.sub}
          </p>
        )}

        {/* Score */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2.5rem',
            padding: '1.25rem 2.5rem',
            border: '1px solid rgba(201,168,76,0.2)',
            borderRadius: '2px',
            background: 'rgba(13,17,23,0.4)',
          }}
        >
          <div style={{textAlign: 'center'}}>
            <div
              style={{
                ...S.display,
                fontSize: '2.5rem',
                fontWeight: 900,
                ...S.accent,
                lineHeight: 1,
                marginBottom: '0.2rem',
              }}
            >
              {totalScored > 0 ? `${correctCount}/${totalScored}` : '—'}
            </div>
            <div style={{fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', ...S.faint}}>
              Richtig
            </div>
          </div>

          <div style={{width: '1px', height: '40px', background: 'var(--color-border)'}} />

          <div style={{textAlign: 'center'}}>
            <div
              style={{
                ...S.display,
                fontSize: '2.5rem',
                fontWeight: 900,
                ...S.accent,
                lineHeight: 1,
                marginBottom: '0.2rem',
              }}
            >
              +{points}
            </div>
            <div style={{fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', ...S.faint}}>
              Gauß-Punkte
            </div>
          </div>
        </div>
      </div>

      {/* Answer review */}
      <div style={{marginBottom: '2.5rem'}}>
        <div
          style={{
            fontSize: '0.62rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            ...S.faint,
            marginBottom: '1rem',
          }}
        >
          Auswertung
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: '0.6rem'}}>
          {questions.map((q, i) => {
            const a = answers[i]
            const isText = q.type === 'text'

            return (
              <div
                key={q._id}
                style={{
                  padding: '0.85rem 1.1rem',
                  background: 'var(--color-surface)',
                  border: `1px solid ${
                    isText
                      ? 'var(--color-border)'
                      : a?.correct
                        ? 'rgba(74,222,128,0.25)'
                        : 'rgba(248,113,113,0.25)'
                  }`,
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                }}
              >
                <span
                  style={{
                    fontSize: '0.85rem',
                    marginTop: '1px',
                    color: isText
                      ? 'var(--color-textFaint)'
                      : a?.correct
                        ? 'rgb(134,239,172)'
                        : 'rgb(252,165,165)',
                    flexShrink: 0,
                    fontWeight: 700,
                  }}
                >
                  {isText ? '–' : a?.correct ? '✓' : '✗'}
                </span>
                <span style={{fontSize: '0.95rem', lineHeight: 1.55, color: 'var(--color-textMuted)'}}>
                  {q.question}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
        <button className="btn-primary" onClick={onRestart}>
          Erneut versuchen
        </button>
        <button className="btn-outline" onClick={onBack}>
          Zurück zu den Vorlesungen
        </button>
      </div>
    </div>
  )
}
