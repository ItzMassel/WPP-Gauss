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
  answer: number
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

export type Step = InfoStep | ChoiceStep | FillStep | OrderStep | MatchStep
export type ExerciseStep = Exclude<Step, InfoStep>

export type Answer =
  | {kind: 'info'}
  | {kind: 'choice'; picked: number | null}
  | {kind: 'fill'; slots: (string | null)[]}
  | {kind: 'order'; placed: string[]}
  | {kind: 'match'; matched: number[]; mistakes: number}

// ─── Lektion: Carl Friedrich Gauß – Leben, Werk und Weggefährten ──────────────

export const lessonTitle = 'Leben, Werk und Weggefährten'

export const lessonSteps: Step[] = [
  // ── 1 · Leben ────────────────────────────────────────────────────────────
  {
    kind: 'info',
    id: 'leben-info',
    section: 'Leben',
    title: 'Der Fürst der Mathematiker',
    emblem: '1777–1855',
    text: 'Carl Friedrich Gauß kam 1777 in Braunschweig zur Welt und starb 1855 in Göttingen – im Alter von 77 Jahren. Schon zu Lebzeiten nannte man ihn „Princeps mathematicorum“, den Fürsten der Mathematiker.',
    facts: [
      {label: 'Geboren', value: '30. April 1777, Braunschweig'},
      {label: 'Gestorben', value: '23. Februar 1855, Göttingen (77 Jahre)'},
      {label: 'Ehrentitel', value: 'Princeps mathematicorum'},
    ],
  },
  {
    kind: 'choice',
    id: 'leben-geburtsort',
    section: 'Leben',
    prompt: 'In welcher Stadt wurde Gauß geboren?',
    options: ['Göttingen', 'Braunschweig', 'Hannover', 'Bremen'],
    answer: 1,
    explanation: 'Gauß wurde am 30. April 1777 in Braunschweig geboren.',
  },
  {
    kind: 'fill',
    id: 'leben-lueckentext',
    section: 'Leben',
    prompt: 'Ergänze den Satz',
    template: 'Gauß wurde 1777 in {0} geboren und starb 1855 in {1}.',
    bank: ['Braunschweig', 'Göttingen', 'Hannover', 'Altona'],
    answers: ['Braunschweig', 'Göttingen'],
    explanation: 'Geboren in Braunschweig, gestorben in Göttingen, wo er fast ein halbes Jahrhundert wirkte.',
  },
  {
    kind: 'choice',
    id: 'leben-alter',
    section: 'Leben',
    prompt: 'Wie alt wurde Gauß?',
    options: ['67 Jahre', '72 Jahre', '77 Jahre', '85 Jahre'],
    answer: 2,
    explanation:
      'Er starb im Februar 1855, noch vor seinem 78. Geburtstag im April – also mit 77 Jahren.',
  },
  {
    kind: 'choice',
    id: 'leben-titel',
    section: 'Leben',
    prompt: 'Was bedeutet der Ehrentitel „Princeps mathematicorum“?',
    options: [
      'Fürst der Mathematiker',
      'Lehrer der Fürsten',
      'Erfinder der Zahlen',
      'Vater der Geometrie',
    ],
    answer: 0,
    explanation: '„Princeps“ heißt „der Erste“ oder „Fürst“ – Gauß galt als der Erste unter den Mathematikern.',
  },

  // ── 2 · Weggefährten ─────────────────────────────────────────────────────
  {
    kind: 'info',
    id: 'weggefaehrten-info',
    section: 'Weggefährten',
    title: 'Fünf Weggefährten',
    emblem: '5',
    text: 'Gauß arbeitete nie allein. Mit Astronomen, Forschern und Mathematikern tauschte er sich ein Leben lang in Briefen und Gesprächen aus.',
    facts: [
      {label: 'Heinrich Christian Schumacher', value: 'Astronom in Altona, enger Briefpartner'},
      {label: 'Alexander von Humboldt', value: 'Naturforscher und Forschungsreisender'},
      {label: 'Heinrich Wilhelm Olbers', value: 'Arzt und Astronom in Bremen'},
      {label: 'Farkas Bolyai', value: 'Ungarischer Mathematiker, Studienfreund aus Göttingen'},
      {label: 'János Bolyai', value: 'Sohn von Farkas, Wegbereiter der nichteuklidischen Geometrie'},
    ],
  },
  {
    kind: 'match',
    id: 'weggefaehrten-zuordnung',
    section: 'Weggefährten',
    prompt: 'Wer war wer? Ordne die Weggefährten zu',
    pairs: [
      ['Schumacher', 'Astronom in Altona'],
      ['Humboldt', 'Forschungsreisender'],
      ['Olbers', 'Arzt und Astronom in Bremen'],
      ['Farkas Bolyai', 'Studienfreund aus Göttingen'],
      ['János Bolyai', 'Nichteuklidische Geometrie'],
    ],
    explanation: 'Gut gemerkt – ein Netzwerk aus Astronomie, Forschung und Geometrie.',
  },
  {
    kind: 'choice',
    id: 'weggefaehrten-bolyai',
    section: 'Weggefährten',
    prompt: 'Welche beiden Weggefährten waren Vater und Sohn?',
    options: [
      'Humboldt und Olbers',
      'Farkas und János Bolyai',
      'Schumacher und Olbers',
      'Humboldt und Schumacher',
    ],
    answer: 1,
    explanation: 'Farkas Bolyai war mit Gauß befreundet, sein Sohn János entwickelte eine neue, nichteuklidische Geometrie.',
  },

  // ── 3 · Telegraf ─────────────────────────────────────────────────────────
  {
    kind: 'info',
    id: 'telegraf-info',
    section: 'Erfindungen',
    title: 'Der erste elektromagnetische Telegraf',
    emblem: '1833',
    text: 'Gemeinsam mit dem Physiker Wilhelm Weber baute Gauß 1833 in Göttingen den ersten elektromagnetischen Telegrafen. Eine Drahtleitung über die Dächer der Stadt verband die Sternwarte mit dem physikalischen Kabinett.',
    facts: [
      {label: 'Jahr', value: '1833'},
      {label: 'Ort', value: 'Göttingen'},
      {label: 'Partner', value: 'Wilhelm Weber'},
    ],
  },
  {
    kind: 'choice',
    id: 'telegraf-partner',
    section: 'Erfindungen',
    prompt: 'Mit wem erfand Gauß 1833 den ersten elektromagnetischen Telegrafen?',
    options: ['Wilhelm Weber', 'Alexander von Humboldt', 'Heinrich Olbers', 'János Bolyai'],
    answer: 0,
    explanation: 'Gauß und der Physiker Wilhelm Weber arbeiteten in Göttingen eng zusammen.',
  },
  {
    kind: 'fill',
    id: 'telegraf-lueckentext',
    section: 'Erfindungen',
    prompt: 'Ergänze den Satz',
    template: 'Im Jahr {0} baute Gauß zusammen mit {1} in {2} den ersten elektromagnetischen {3}.',
    bank: ['1833', 'Wilhelm Weber', 'Göttingen', 'Telegrafen', '1855', 'Hannover', 'Telefon', 'Olbers'],
    answers: ['1833', 'Wilhelm Weber', 'Göttingen', 'Telegrafen'],
    explanation: '1833, Wilhelm Weber, Göttingen – und ein Telegraf, lange vor dem Telefon.',
  },

  // ── 4 · Heliotrop ────────────────────────────────────────────────────────
  {
    kind: 'info',
    id: 'heliotrop-info',
    section: 'Erfindungen',
    title: 'Das Heliotrop',
    emblem: 'um 1820',
    text: 'Für die Landesvermessung des Königreichs Hannover entwickelte Gauß das Heliotrop („Sonnenwender“): Ein Spiegel wirft Sonnenlicht über viele Kilometer zum Messpunkt. So wurden weit entfernte Berggipfel genau anpeilbar.',
    facts: [
      {label: 'Name', value: 'Heliotrop – der „Sonnenwender“'},
      {label: 'Prinzip', value: 'Ein Spiegel reflektiert das Sonnenlicht gezielt'},
      {label: 'Zweck', value: 'Hannoversche Landesvermessung'},
    ],
  },
  {
    kind: 'choice',
    id: 'heliotrop-zweck',
    section: 'Erfindungen',
    prompt: 'Wofür entwickelte Gauß das Heliotrop?',
    options: [
      'Für die Landesvermessung in Hannover',
      'Zum Beobachten von Sonnenflecken',
      'Als Uhr für die Sternwarte',
      'Zum Bau von Brücken',
    ],
    answer: 0,
    explanation: 'Mit dem Heliotrop wurden Messpunkte über große Entfernungen sichtbar gemacht.',
  },

  // ── 5 · 17-Eck ───────────────────────────────────────────────────────────
  {
    kind: 'info',
    id: 'siebzehneck-info',
    section: 'Entdeckungen',
    title: 'Das regelmäßige Siebzehneck',
    emblem: '17',
    text: 'Mit nur 19 Jahren bewies Gauß, dass sich das regelmäßige Siebzehneck allein mit Zirkel und Lineal konstruieren lässt – eine Frage, die seit der Antike offen war. Der Überlieferung nach wünschte er sich ein 17-Eck auf seinem Grabstein.',
    facts: [
      {label: 'Alter', value: '19 Jahre (1796)'},
      {label: 'Werkzeuge', value: 'Nur Zirkel und Lineal'},
      {label: 'Besonderheit', value: 'Offene Frage seit der Antike'},
    ],
  },
  {
    kind: 'choice',
    id: 'siebzehneck-alter',
    section: 'Entdeckungen',
    prompt: 'Wie alt war Gauß, als er die Konstruierbarkeit des 17-Ecks bewies?',
    options: ['14 Jahre', '19 Jahre', '25 Jahre', '33 Jahre'],
    answer: 1,
    explanation: 'Mit 19 Jahren gelang ihm der Beweis – das gilt als Wendepunkt für seine Berufswahl.',
  },
  {
    kind: 'choice',
    id: 'siebzehneck-werkzeug',
    section: 'Entdeckungen',
    prompt: 'Mit welchen Werkzeugen lässt sich das regelmäßige 17-Eck konstruieren?',
    options: [
      'Geodreieck und Winkelmesser',
      'Nur mit einem Lineal',
      'Zirkel und Lineal',
      'Nur mit einem Computer',
    ],
    answer: 2,
    explanation: 'Zirkel und Lineal reichen aus – genau das hatte Gauß bewiesen.',
  },

  // ── 6 · Der kleine Gauß ──────────────────────────────────────────────────
  {
    kind: 'info',
    id: 'summe-info',
    section: 'Entdeckungen',
    title: 'Der „kleine Gauß“',
    emblem: '5050',
    text: 'Als Schüler soll Gauß die Zahlen von 1 bis 100 blitzschnell addiert haben. Sein Trick: 1 + 100 = 101, 2 + 99 = 101, 3 + 98 = 101 … – insgesamt 50 solcher Paare. Also ist 50 · 101 = 5050.',
    facts: [
      {label: 'Aufgabe', value: '1 + 2 + 3 + … + 100'},
      {label: 'Formel', value: 'n · (n + 1) ÷ 2'},
      {label: 'Ergebnis', value: '5050'},
    ],
  },
  {
    kind: 'order',
    id: 'summe-reihenfolge',
    section: 'Entdeckungen',
    prompt: 'Bringe Gauß’ Rechentrick in die richtige Reihenfolge',
    items: [
      'Erste und letzte Zahl addieren: 1 + 100 = 101',
      '2 + 99, 3 + 98 … ergeben ebenfalls 101',
      'Es gibt genau 50 solcher Paare',
      'Rechnung: 50 · 101 = 5050',
    ],
    explanation: 'Paare bilden, Paare zählen, multiplizieren – fertig.',
  },
  {
    kind: 'fill',
    id: 'summe-lueckentext',
    section: 'Entdeckungen',
    prompt: 'Ergänze den Satz',
    template: 'Es gibt {0} Paare mit der Summe {1}. Also ist 1 + 2 + … + 100 = {2}.',
    bank: ['50', '101', '5050', '100', '5000', '5151'],
    answers: ['50', '101', '5050'],
    explanation: '50 Paare mal 101 ergibt 5050.',
  },

  // ── 7 · Finale ───────────────────────────────────────────────────────────
  {
    kind: 'order',
    id: 'finale-chronologie',
    section: 'Finale',
    prompt: 'Sortiere Gauß’ Lebensstationen zeitlich',
    items: [
      '1777: Geburt in Braunschweig',
      '1796: Beweis zum 17-Eck mit 19 Jahren',
      '1833: Telegraf mit Wilhelm Weber',
      '1855: Tod in Göttingen',
    ],
    explanation: 'Von der Geburt über den Beweis mit 19 bis zum Telegrafen – ein erfülltes Forscherleben.',
  },
]

export const exerciseCount = lessonSteps.filter((s) => s.kind !== 'info').length

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

export function blankCount(step: FillStep): number {
  return step.answers.length
}

export function emptyAnswer(step: Step): Answer {
  switch (step.kind) {
    case 'info':
      return {kind: 'info'}
    case 'choice':
      return {kind: 'choice', picked: null}
    case 'fill':
      return {kind: 'fill', slots: Array<string | null>(blankCount(step)).fill(null)}
    case 'order':
      return {kind: 'order', placed: []}
    case 'match':
      return {kind: 'match', matched: [], mistakes: 0}
  }
}

export function isReady(step: Step, answer: Answer): boolean {
  if (step.kind === 'choice' && answer.kind === 'choice') return answer.picked !== null
  if (step.kind === 'fill' && answer.kind === 'fill') return answer.slots.every((s) => s !== null)
  if (step.kind === 'order' && answer.kind === 'order') return answer.placed.length === step.items.length
  if (step.kind === 'match' && answer.kind === 'match') return answer.matched.length === step.pairs.length
  return false
}

export function isCorrect(step: Step, answer: Answer): boolean {
  if (step.kind === 'choice' && answer.kind === 'choice') return answer.picked === step.answer
  if (step.kind === 'fill' && answer.kind === 'fill')
    return step.answers.every((a, i) => answer.slots[i] === a)
  if (step.kind === 'order' && answer.kind === 'order')
    return step.items.every((item, i) => answer.placed[i] === item)
  // Zuordnung: Fehlgriffe kosten sofort ein Herz, am Ende ist sie immer vollständig richtig.
  if (step.kind === 'match' && answer.kind === 'match') return answer.matched.length === step.pairs.length
  return false
}

export function correctText(step: ExerciseStep): string | null {
  if (step.kind === 'choice') return step.options[step.answer]
  if (step.kind === 'fill') return step.answers.join(' · ')
  return null
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
