// Erzeugt die feste Hindernis-Karte für alle vier Level. Der Algorithmus läuft
// deterministisch (fester Seed pro Level) beim Modul-Import einmal durch — jeder
// Spieler bekommt exakt dieselbe Karte. Für jedes neu platzierte Hindernis wird
// anhand der Timing-Formeln aus physics.ts geprüft, ob die Aktion des vorherigen
// Hindernisses (Sprung/Hecht + Landen) rechtzeitig abgeschlossen ist, bevor die
// nächste Aktion beginnen muss — inklusive Reaktionszeit-Puffer. Ist eine zufällig
// gewürfelte Lücke zu knapp, wird sie automatisch vergrößert, bis die Kette
// tatsächlich überlebbar ist.

import {
  crossingTime,
  earliestRequirement,
  OBSTACLE_WIDTH,
  PORTAL_WIDTH,
  REACTION_TIME,
  SCROLL_SPEED,
  timingFor,
  type ObstacleKind,
  type Timing,
} from './physics'

export const LEVEL_DURATION = 180 // Sekunden = genau 3 Minuten pro Level (4 * 260px/s * 180s Weltstrecke)
const SAFETY_END_MARGIN = 6 // letzte Sekunden jedes Levels bleiben hindernisfrei ("Auslauf" vor dem Checkpoint)
const START_DELAY = 3 // ruhige Anlaufzeit zu Levelbeginn

export type SpawnKind = ObstacleKind | 'portal'

export interface LevelEvent {
  kind: SpawnKind
  /** Ankunftszeit am Spieler, in Sekunden seit Levelbeginn. */
  t0: number
  width: number
  timing: Timing
  /** Wie knapp die Eingabe zur vorherigen Aktion getimt ist (0 = maximal knapp). */
  slack: number
}

export interface LevelDef {
  index: number
  name: string
  difficulty: 'Leicht' | 'Mittel' | 'Schwer' | 'Sehr schwer'
  background: number
  events: LevelEvent[]
}

interface LevelTuning {
  seed: number
  baseGap: number
  gapJitter: number
  weights: Record<SpawnKind, number>
}

const TUNING: LevelTuning[] = [
  {
    seed: 1337,
    baseGap: 4.4,
    gapJitter: 0.8,
    weights: {ground: 0.45, overhead: 0.35, lowbeam: 0, portal: 0.2},
  },
  {
    seed: 2024,
    baseGap: 3.4,
    gapJitter: 0.7,
    weights: {ground: 0.35, overhead: 0.3, lowbeam: 0.15, portal: 0.2},
  },
  {
    seed: 4711,
    baseGap: 2.6,
    gapJitter: 0.6,
    weights: {ground: 0.3, overhead: 0.25, lowbeam: 0.25, portal: 0.2},
  },
  {
    seed: 9999,
    baseGap: 1.9,
    gapJitter: 0.5,
    weights: {ground: 0.25, overhead: 0.2, lowbeam: 0.35, portal: 0.2},
  },
]

const META: {name: string; difficulty: LevelDef['difficulty']; background: number}[] = [
  {name: 'Kindheit in Braunschweig', difficulty: 'Leicht', background: 0x0d1117},
  {name: 'Göttinger Studienjahre', difficulty: 'Mittel', background: 0x14243a},
  {name: 'Die Ceres-Berechnung', difficulty: 'Schwer', background: 0x2a1f3d},
  {name: 'Princeps Mathematicorum', difficulty: 'Sehr schwer', background: 0x1a0f16},
]

// mulberry32 — winziger, deterministischer PRNG (reicht für einen festen Seed).
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pickKind(rng: () => number, weights: Record<SpawnKind, number>): SpawnKind {
  const total = Object.values(weights).reduce((a, b) => a + b, 0)
  let roll = rng() * total
  for (const [kind, weight] of Object.entries(weights) as [SpawnKind, number][]) {
    if (roll < weight) return kind
    roll -= weight
  }
  return 'ground'
}

function widthFor(kind: SpawnKind): number {
  return kind === 'portal' ? PORTAL_WIDTH : OBSTACLE_WIDTH[kind]
}

function timingForKind(kind: SpawnKind, width: number): Timing {
  // Ein Portal braucht keine Eingabe, um es "rechtzeitig" zu passieren — es pausiert
  // das Spiel bei Kontakt und ist beliebig verzögerbar, solange es nichts überlappt.
  if (kind === 'portal') return {inputs: [], settleOffset: crossingTime(width)}
  return timingFor(kind, width)
}

/** Frühester erlaubter t0 für das nächste Hindernis, gegeben das vorherige. */
function minNextT0(prev: LevelEvent, nextTiming: Timing, nextWidth: number): number {
  const prevSettleAbs = prev.t0 + prev.timing.settleOffset
  const nextEarliest = earliestRequirement(nextTiming)
  const timingBound = prevSettleAbs + REACTION_TIME - nextEarliest

  // Zusätzlich: rein physische Mindestlücke, damit sich die Hindernis-Rechtecke
  // beim Scrollen nicht überlappen.
  const physicalBound = prev.t0 + (prev.width + nextWidth) / 2 / SCROLL_SPEED + 0.3

  return Math.max(timingBound, physicalBound)
}

function generateLevel(index: number): LevelDef {
  const tuning = TUNING[index]
  const meta = META[index]
  const rng = mulberry32(tuning.seed)
  const events: LevelEvent[] = []

  let candidateT0 = START_DELAY
  let prev: LevelEvent | null = null

  while (candidateT0 < LEVEL_DURATION - SAFETY_END_MARGIN) {
    const kind = pickKind(rng, tuning.weights)
    const width = widthFor(kind)
    const timing = timingForKind(kind, width)

    let t0 = candidateT0
    if (prev) t0 = Math.max(t0, minNextT0(prev, timing, width))
    if (t0 >= LEVEL_DURATION - SAFETY_END_MARGIN) break

    const requiredMin = prev ? minNextT0(prev, timing, width) : t0
    const slack = t0 - requiredMin

    const event: LevelEvent = {kind, t0, width, timing, slack}
    events.push(event)
    prev = event

    const gap = tuning.baseGap + (rng() * 2 - 1) * tuning.gapJitter
    candidateT0 = t0 + Math.max(gap, 0.6)
  }

  return {index, name: meta.name, difficulty: meta.difficulty, background: meta.background, events}
}

export const LEVELS: LevelDef[] = TUNING.map((_, i) => generateLevel(i))
