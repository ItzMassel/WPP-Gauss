// ─── Types ────────────────────────────────────────────────────────────────────

interface StepBase {
  id: string
  section: string
}

export interface InfoStep extends StepBase {
  kind: 'info'
  title: string
  emblem: string
  text: string
  facts: {label: string; value: string}[]
}

export interface ChoiceStep extends StepBase {
  kind: 'choice'
  prompt: string
  options: string[]
  /** Indizes der richtigen Optionen. */
  answers: number[]
  /** Mehrere richtige Antworten → Mehrfachauswahl. */
  multi: boolean
  explanation: string
}

export interface GuessStep extends StepBase {
  kind: 'guess'
  prompt: string
  correct: number
  /** Optionaler Toleranzbereich (wie im Quiz). */
  min?: number
  max?: number
  explanation: string
}

/** Freitext: wird nicht bewertet, zählt immer als richtig. */
export interface TextStep extends StepBase {
  kind: 'text'
  prompt: string
  explanation: string
}

export interface FillStep extends StepBase {
  kind: 'fill'
  prompt: string
  /** Lückentext – `{0}`, `{1}` … markieren die Lücken. */
  template: string
  /** Wortbank inkl. Ablenker (jeder Eintrag nur einmal). */
  bank: string[]
  answers: string[]
  explanation: string
}

export interface OrderStep extends StepBase {
  kind: 'order'
  prompt: string
  /** Die Einträge in der RICHTIGEN Reihenfolge. */
  items: string[]
  explanation: string
}

export interface MatchStep extends StepBase {
  kind: 'match'
  prompt: string
  /** [links, rechts] – gleicher Index = zusammengehörig. */
  pairs: [string, string][]
  explanation: string
}

export type Step = InfoStep | ChoiceStep | GuessStep | TextStep | FillStep | OrderStep | MatchStep
export type ExerciseStep = Exclude<Step, InfoStep>

export type Answer =
  | {kind: 'info'}
  | {kind: 'choice'; picked: number[]}
  | {kind: 'guess'; value: string}
  | {kind: 'text'; value: string}
  | {kind: 'fill'; slots: (string | null)[]}
  | {kind: 'order'; placed: string[]}
  | {kind: 'match'; matched: number[]; mistakes: number}

// ─── Sanity → Lektion ─────────────────────────────────────────────────────────

export interface SanityQuestionDoc {
  _id: string
  question: string
  type: 'multiplechoice' | 'yesno' | 'guess' | 'sort' | 'text' | 'fill' | 'match' | 'info'
  explanation?: string
  options?: {_key: string; label: string; correct?: boolean}[]
  multipleCorrect?: boolean
  correctAnswer?: boolean
  correctNumber?: number
  rangeMin?: number
  rangeMax?: number
  sortItems?: string[]
  fillTemplate?: string
  fillAnswers?: string[]
  fillDistractors?: string[]
  matchPairs?: {left: string; right: string}[]
  infoEmblem?: string
  infoText?: string
  infoFacts?: {label: string; value: string}[]
}

export interface SanityLectureDoc {
  _id: string
  title: string
  questions: (SanityQuestionDoc | null)[] | null
}

/** Wandelt ein Sanity-Dokument in einen Lektionsschritt um – unvollständige Dokumente werden übersprungen. */
export function toStep(q: SanityQuestionDoc, section: string): Step | null {
  const base = {id: q._id, section}
  const explanation = q.explanation ?? ''
  switch (q.type) {
    case 'multiplechoice': {
      const options = q.options ?? []
      const answers = options.flatMap((o, i) => (o.correct ? [i] : []))
      if (options.length < 2 || answers.length === 0) return null
      return {...base, kind: 'choice', prompt: q.question, options: options.map((o) => o.label), answers, multi: answers.length > 1, explanation}
    }
    case 'yesno':
      if (q.correctAnswer === undefined || q.correctAnswer === null) return null
      return {...base, kind: 'choice', prompt: q.question, options: ['Ja', 'Nein'], answers: [q.correctAnswer ? 0 : 1], multi: false, explanation}
    case 'guess':
      if (q.correctNumber === undefined || q.correctNumber === null) return null
      return {...base, kind: 'guess', prompt: q.question, correct: q.correctNumber, min: q.rangeMin, max: q.rangeMax, explanation}
    case 'sort':
      if (!q.sortItems || q.sortItems.length < 2) return null
      return {...base, kind: 'order', prompt: q.question, items: q.sortItems, explanation}
    case 'text':
      return {...base, kind: 'text', prompt: q.question, explanation}
    case 'fill': {
      const answers = q.fillAnswers ?? []
      if (!q.fillTemplate || answers.length === 0) return null
      const bank = [...new Set([...answers, ...(q.fillDistractors ?? [])])]
      return {...base, kind: 'fill', prompt: q.question, template: q.fillTemplate, bank, answers, explanation}
    }
    case 'match': {
      const pairs = (q.matchPairs ?? []).map((p): [string, string] => [p.left, p.right])
      if (pairs.length < 2) return null
      return {...base, kind: 'match', prompt: q.question, pairs, explanation}
    }
    case 'info':
      return {...base, kind: 'info', title: q.question, emblem: q.infoEmblem ?? '', text: q.infoText ?? '', facts: q.infoFacts ?? []}
    default:
      return null
  }
}

/** Alle Vorlesungen in Reihenfolge → eine flache Liste von Schritten (jede Frage nur einmal). */
export function buildSteps(lectures: SanityLectureDoc[]): Step[] {
  const seen = new Set<string>()
  const steps: Step[] = []
  for (const lecture of lectures) {
    for (const q of lecture.questions ?? []) {
      if (!q || seen.has(q._id)) continue
      seen.add(q._id)
      const step = toStep(q, lecture.title)
      if (step) steps.push(step)
    }
  }
  return steps
}

export const lessonTitle = 'Leben, Werk und Weggefährten'

// ─── Feedback messages ────────────────────────────────────────────────────────

export const praise = [
  'Ausgezeichnet!',
  'Genau richtig!',
  'Wie ein echter Mathematiker!',
  'Brillant!',
  'Gauß wäre stolz!',
  'Fantastisch!',
]

export const consolation = [
  'Nicht ganz …',
  'Fast – schau dir die Lösung an!',
  'Übung macht den Meister.',
  'Kein Problem, das kommt gleich nochmal.',
]

export const instruction: Record<ExerciseStep['kind'], string> = {
  choice: 'Wähle die richtige Antwort',
  guess: 'Schätze die Zahl',
  text: 'Freitext',
  fill: 'Lückentext',
  order: 'Richtige Reihenfolge',
  match: 'Zuordnung',
}

// ─── Logic ────────────────────────────────────────────────────────────────────

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Mischt, bis die Reihenfolge garantiert von der Vorlage abweicht. */
export function shuffleDifferent<T>(arr: T[]): T[] {
  if (arr.length < 2) return [...arr]
  let out = shuffle(arr)
  while (out.every((item, i) => item === arr[i])) out = shuffle(arr)
  return out
}

/** „1.234“ und „1234,5“ → Zahl; alles andere → null. */
export function parseNumber(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  if (t === '' || !/^-?\d+(\.\d+)?$/.test(t)) return null
  return Number(t)
}

export function blankCount(step: FillStep): number {
  return step.answers.length
}

export function emptyAnswer(step: Step): Answer {
  switch (step.kind) {
    case 'info':
      return {kind: 'info'}
    case 'choice':
      return {kind: 'choice', picked: []}
    case 'guess':
      return {kind: 'guess', value: ''}
    case 'text':
      return {kind: 'text', value: ''}
    case 'fill':
      return {kind: 'fill', slots: Array<string | null>(blankCount(step)).fill(null)}
    case 'order':
      return {kind: 'order', placed: []}
    case 'match':
      return {kind: 'match', matched: [], mistakes: 0}
  }
}

export function isReady(step: Step, answer: Answer): boolean {
  if (step.kind === 'choice' && answer.kind === 'choice') return answer.picked.length > 0
  if (step.kind === 'guess' && answer.kind === 'guess') return parseNumber(answer.value) !== null
  if (step.kind === 'text' && answer.kind === 'text') return answer.value.trim().length > 0
  if (step.kind === 'fill' && answer.kind === 'fill') return answer.slots.every((s) => s !== null)
  if (step.kind === 'order' && answer.kind === 'order') return answer.placed.length === step.items.length
  if (step.kind === 'match' && answer.kind === 'match') return answer.matched.length === step.pairs.length
  return false
}

export function isCorrect(step: Step, answer: Answer): boolean {
  if (step.kind === 'choice' && answer.kind === 'choice')
    return answer.picked.length === step.answers.length && step.answers.every((a) => answer.picked.includes(a))
  if (step.kind === 'guess' && answer.kind === 'guess') {
    const value = parseNumber(answer.value)
    if (value === null) return false
    return step.min !== undefined && step.max !== undefined
      ? value >= step.min && value <= step.max
      : value === step.correct
  }
  if (step.kind === 'text') return true
  if (step.kind === 'fill' && answer.kind === 'fill')
    return step.answers.every((a, i) => answer.slots[i] === a)
  if (step.kind === 'order' && answer.kind === 'order')
    return step.items.every((item, i) => answer.placed[i] === item)
  // Zuordnung: Fehlgriffe kosten sofort ein Herz, am Ende ist sie immer vollständig richtig.
  if (step.kind === 'match' && answer.kind === 'match') return answer.matched.length === step.pairs.length
  return false
}

export function correctText(step: ExerciseStep): string | null {
  if (step.kind === 'choice') return step.answers.map((i) => step.options[i]).join(' · ')
  if (step.kind === 'guess') return String(step.correct)
  if (step.kind === 'fill') return step.answers.join(' · ')
  return null
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
