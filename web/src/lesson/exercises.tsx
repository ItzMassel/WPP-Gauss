import {useEffect, useRef, useState} from 'react'
import {
  shuffle,
  shuffleDifferent,
  type Answer,
  type ChoiceStep,
  type FillStep,
  type InfoStep,
  type MatchStep,
  type OrderStep,
} from './lessonData'

type ViewProps<S, A extends Answer> = {
  step: S
  answer: A
  locked: boolean
  onChange: (a: A) => void
}

// ─── Info ─────────────────────────────────────────────────────────────────────

export function InfoView({step}: {step: InfoStep}) {
  return (
    <div className="ls-info">
      <div className="ls-info-emblem" aria-hidden data-long={step.emblem.length > 5}>
        {step.emblem}
      </div>
      <h2 className="ls-info-title">{step.title}</h2>
      <p className="ls-info-text">{step.text}</p>
      <dl className="ls-facts">
        {step.facts.map((f) => (
          <div className="ls-fact" key={f.label}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

// ─── Multiple Choice ──────────────────────────────────────────────────────────

export function ChoiceView({step, answer, locked, onChange}: ViewProps<ChoiceStep, Extract<Answer, {kind: 'choice'}>>) {
  return (
    <div className="ls-stack" role="radiogroup" aria-label={step.prompt}>
      {step.options.map((opt, i) => {
        const selected = answer.picked === i
        const isAnswer = i === step.answer
        const state = locked
          ? isAnswer
            ? 'is-correct'
            : selected
              ? 'is-wrong'
              : 'is-dim'
          : selected
            ? 'is-selected'
            : ''
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={locked}
            className={`ls-choice ${state}`}
            onClick={() => onChange({kind: 'choice', picked: i})}
          >
            <span className="ls-key">{i + 1}</span>
            <span>{opt}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Lückentext ───────────────────────────────────────────────────────────────

export function FillView({step, answer, locked, onChange}: ViewProps<FillStep, Extract<Answer, {kind: 'fill'}>>) {
  const [bank] = useState(() => shuffle(step.bank))
  const tokens = step.template.split(/(\{\d+\})/).filter(Boolean)

  function place(word: string) {
    if (locked || answer.slots.includes(word)) return
    const idx = answer.slots.indexOf(null)
    if (idx === -1) return
    const slots = [...answer.slots]
    slots[idx] = word
    onChange({kind: 'fill', slots})
  }

  function clear(idx: number) {
    if (locked || answer.slots[idx] === null) return
    const slots = [...answer.slots]
    slots[idx] = null
    onChange({kind: 'fill', slots})
  }

  return (
    <div>
      <p className="ls-sentence">
        {tokens.map((tok, i) => {
          const m = /^\{(\d+)\}$/.exec(tok)
          if (!m) return <span key={i}>{tok}</span>
          const idx = Number(m[1])
          const value = answer.slots[idx]
          const state = locked
            ? value === step.answers[idx]
              ? 'is-correct'
              : 'is-wrong'
            : value
              ? 'is-filled'
              : ''
          return (
            <button
              key={i}
              type="button"
              className={`ls-blank ${state}`}
              disabled={locked || value === null}
              aria-label={value ? `Lücke ${idx + 1}: ${value} (zum Entfernen antippen)` : `Lücke ${idx + 1}: leer`}
              onClick={() => clear(idx)}
            >
              {value ?? ''}
            </button>
          )
        })}
      </p>

      <div className="ls-bank" aria-label="Wortbank">
        {bank.map((word) => {
          const used = answer.slots.includes(word)
          return (
            <button
              key={word}
              type="button"
              disabled={locked || used}
              className={`ls-token ${used ? 'is-used' : ''}`}
              onClick={() => place(word)}
            >
              {word}
            </button>
          )
        })}
      </div>

      {locked && answer.slots.some((s, i) => s !== step.answers[i]) && (
        <p className="ls-reveal">
          Richtig: <strong>{step.answers.join(' · ')}</strong>
        </p>
      )}
    </div>
  )
}

// ─── Reihenfolge ──────────────────────────────────────────────────────────────

export function OrderView({step, answer, locked, onChange}: ViewProps<OrderStep, Extract<Answer, {kind: 'order'}>>) {
  const [pool] = useState(() => shuffleDifferent(step.items))
  const available = pool.filter((item) => !answer.placed.includes(item))
  const wrong = locked && answer.placed.some((item, i) => item !== step.items[i])

  return (
    <div>
      <div className="ls-slots" aria-label="Deine Reihenfolge">
        {step.items.map((_, i) => {
          const item = answer.placed[i]
          const state = locked && item ? (item === step.items[i] ? 'is-correct' : 'is-wrong') : item ? 'is-filled' : ''
          return item ? (
            <button
              key={i}
              type="button"
              disabled={locked}
              className={`ls-slot ${state}`}
              onClick={() => onChange({kind: 'order', placed: answer.placed.filter((p) => p !== item)})}
            >
              <span className="ls-key">{i + 1}</span>
              <span>{item}</span>
            </button>
          ) : (
            <div key={i} className="ls-slot is-empty" aria-hidden>
              <span className="ls-key">{i + 1}</span>
            </div>
          )
        })}
      </div>

      <div className="ls-bank ls-bank-col">
        {available.map((item) => (
          <button
            key={item}
            type="button"
            disabled={locked}
            className="ls-token ls-token-wide"
            onClick={() => onChange({kind: 'order', placed: [...answer.placed, item]})}
          >
            {item}
          </button>
        ))}
      </div>

      {wrong && (
        <div className="ls-reveal">
          <div className="ls-reveal-label">Richtige Reihenfolge</div>
          <ol>
            {step.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

// ─── Zuordnung ────────────────────────────────────────────────────────────────

export function MatchView({
  step,
  answer,
  locked,
  onChange,
  onMistake,
}: ViewProps<MatchStep, Extract<Answer, {kind: 'match'}>> & {onMistake: () => void}) {
  const [rightOrder] = useState(() => shuffleDifferent(step.pairs.map((_, i) => i)))
  const [selL, setSelL] = useState<number | null>(null)
  const [selR, setSelR] = useState<number | null>(null)
  const [flash, setFlash] = useState<{l: number; r: number} | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function attempt(l: number, r: number) {
    if (l === r) {
      onChange({kind: 'match', matched: [...answer.matched, l], mistakes: answer.mistakes})
    } else {
      onChange({kind: 'match', matched: answer.matched, mistakes: answer.mistakes + 1})
      onMistake()
      setFlash({l, r})
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setFlash(null), 550)
    }
    setSelL(null)
    setSelR(null)
  }

  function pickLeft(i: number) {
    if (locked || answer.matched.includes(i) || flash) return
    if (selR !== null) attempt(i, selR)
    else setSelL(selL === i ? null : i)
  }

  function pickRight(i: number) {
    if (locked || answer.matched.includes(i) || flash) return
    if (selL !== null) attempt(selL, i)
    else setSelR(selR === i ? null : i)
  }

  const cls = (side: 'l' | 'r', i: number) => {
    if (answer.matched.includes(i)) return 'is-matched'
    if (flash && ((side === 'l' && flash.l === i) || (side === 'r' && flash.r === i))) return 'is-wrong is-shake'
    if ((side === 'l' && selL === i) || (side === 'r' && selR === i)) return 'is-selected'
    return ''
  }

  return (
    <div className="ls-match">
      <div className="ls-stack">
        {step.pairs.map(([left], i) => (
          <button
            key={left}
            type="button"
            disabled={locked || answer.matched.includes(i)}
            aria-pressed={selL === i}
            className={`ls-pill ${cls('l', i)}`}
            onClick={() => pickLeft(i)}
          >
            {left}
          </button>
        ))}
      </div>
      <div className="ls-stack">
        {rightOrder.map((i) => (
          <button
            key={step.pairs[i][1]}
            type="button"
            disabled={locked || answer.matched.includes(i)}
            aria-pressed={selR === i}
            className={`ls-pill ls-pill-right ${cls('r', i)}`}
            onClick={() => pickRight(i)}
          >
            {step.pairs[i][1]}
          </button>
        ))}
      </div>
    </div>
  )
}
