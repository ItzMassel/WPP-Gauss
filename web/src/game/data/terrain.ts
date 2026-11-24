// Gelände-Generator. Hier schreibst du deinen eigenen Algorithmus: generateTerrain()
// bekommt die Größe des Levels und einen Zufallsgenerator und gibt die Liste aller
// Blöcke zurück. Mehr muss der Rest des Spiels nicht wissen.
//
// Koordinaten (Block-Raster, nicht Pixel):
//   col = Spalte, von links nach rechts. 0 = Levelanfang.
//   row = Reihe, von unten nach oben.   0 = direkt auf dem Boden, 1 = ein Block höher, ...
//
//   row 2 |        ██
//   row 1 |     ██ ██ ██
//   row 0 | ██  ██ ██ ██ ██
//         +-----------------> col
//           0  1  2  3  4

import {BLOCK_SIZE, SCROLL_SPEED} from './physics'
import {LEVEL_DURATION, LEVELS, mulberry32} from './levels'

export interface Block {
  col: number
  row: number
}

export interface TerrainContext {
  /** Welches der vier Level gerade erzeugt wird (0–3), z. B. für steigende Schwierigkeit. */
  levelIndex: number
  /** Breite des Levels in Blöcken. */
  columns: number
  /** Maximale Höhe in Blöcken; Blöcke darüber würden aus dem Bild ragen. */
  rows: number
  /** Deterministischer Zufall (0 ≤ x < 1) — gleicher Seed, gleiche Karte. Nimm das statt Math.random(). */
  rng: () => number
}

/** Anzahl Blöcke, die ein komplettes Level breit ist. */
export const LEVEL_COLUMNS = Math.ceil((LEVEL_DURATION * SCROLL_SPEED) / BLOCK_SIZE)
/** Höhe des Spielfelds über dem Boden in Blöcken (Spielfeld ist 400 px hoch). */
export const TERRAIN_ROWS = 10

/** Hilfsfunktion: eine senkrechte Säule in Spalte `col`, von Reihe 0 bis `height - 1`. */
export function column(col: number, height: number): Block[] {
  const blocks: Block[] = []
  for (let row = 0; row < height; row++) blocks.push({col, row})
  return blocks
}

/** Hilfsfunktion: ein gefülltes Rechteck, `width` Blöcke breit und `height` hoch, ab (col, row). */
export function rect(col: number, row: number, width: number, height: number): Block[] {
  const blocks: Block[] = []
  for (let c = col; c < col + width; c++) {
    for (let r = row; r < row + height; r++) blocks.push({col: c, row: r})
  }
  return blocks
}

/**
 * ============================  DEIN CODE  ============================
 *
 * Gib alle Blöcke zurück, die im Level stehen sollen. Die Reihenfolge ist egal.
 * Was hier NICHT drinsteht, ist leere Luft — der flache Boden liegt immer darunter.
 *
 * Beispiel (Hügel mit Sinus), zum Ausprobieren einkommentieren:
 *
 *   for (let col = 10; col < columns; col++) {
 *     const height = Math.round(1 + Math.sin(col / 5) * rng() * 2)
 *     blocks.push(...column(col, Math.max(0, height)))
 *   }
 */
// Spielphysik in Blöcken: Ein Sprung trägt ~3 Blöcke hoch und ~6 Blöcke weit. Eine Stufe von
// 1–2 Blöcken ist daher per Sprung überwindbar, höhere Wände wären eine Sackgasse. Nach unten
// darf es beliebig tief gehen (Fallen schadet nicht).
const START_FLAT = 12 // Spalten flacher Anlauf am Levelanfang
const END_FLAT = 48 // Spalten flacher Auslauf vor dem Checkpoint (~6 s)
const ZONE_BEFORE = 7 // freie Spalten vor einem Hindernis (Anlauf + Absprung)
const ZONE_AFTER = 7 // freie Spalten nach einem Hindernis (Landung, Hecht-Vorspulen)
const PORTAL_ZONE = 4
const MAX_PEAK = [4, 5, 6, 6] // höchster Berg je Level
const CANYON_CHANCE = [0.35, 0.45, 0.5, 0.55]

type Rng = () => number

const randInt = (rng: Rng, min: number, max: number): number => min + Math.floor(rng() * (max - min + 1))

/** Treppe von 0 nach `target`: Stufen von 1 (bei `maxRise` 2 auch 2) Blöcken, jede mindestens 3 Spalten breit, damit Platz zum Anlauf bleibt. */
function ascend(target: number, maxRise: number, rng: Rng): number[] {
  const out: number[] = []
  let cur = 0
  while (cur < target) {
    cur += Math.min(target - cur, maxRise > 1 && rng() < 0.35 ? 2 : 1)
    const tread = randInt(rng, 3, 4)
    for (let i = 0; i < tread; i++) out.push(cur)
  }
  return out
}

/** Abstieg von `from` auf 0: mal sanfte Stufen, mal Klippe. Die letzte Spalte auf Höhe 0 gehört schon zum Flachen danach. */
function descend(from: number, rng: Rng): number[] {
  const out: number[] = []
  let cur = from
  while (cur > 0) {
    const drop = rng() < 0.4 ? cur : Math.min(cur, randInt(rng, 1, 2))
    cur -= drop
    if (cur > 0) for (let i = randInt(rng, 2, 3); i > 0; i--) out.push(cur)
  }
  return out
}

const plateau = (height: number, width: number): number[] => Array<number>(width).fill(height)

/** Ein Berg: Treppe hinauf, Gipfelplateau, Abstieg. */
function mountain(peak: number, maxRise: number, rng: Rng): number[] {
  return [...ascend(peak, maxRise, rng), ...plateau(peak, randInt(rng, 2, 5)), ...descend(peak, rng)]
}

/** Eine Schlucht: Felsplateau, Steilabfall bis auf den Grund, ein Stück Grund, dann Wand/Treppe wieder hinauf. */
function canyon(rimLeft: number, rimRight: number, maxRise: number, rng: Rng): number[] {
  return [
    ...ascend(rimLeft, maxRise, rng),
    ...plateau(rimLeft, randInt(rng, 2, 4)),
    ...plateau(0, randInt(rng, 4, 6)), // Schluchtgrund: lang genug zum Anlauf für die Gegenwand
    ...ascend(rimRight, maxRise, rng),
    ...plateau(rimRight, randInt(rng, 2, 4)),
    ...descend(rimRight, rng),
  ]
}

/**
 * Bergland: Zwischen den Hindernissen (die flachen Boden brauchen) wechseln sich Berge, Schluchten
 * und Flachstücke ab. Jedes Stück beginnt und endet auf Höhe 0, jede Stufe ist per Sprung schaffbar.
 */
export function generateTerrain({levelIndex, columns, rows, rng}: TerrainContext): Block[] {
  const level = Math.min(levelIndex, MAX_PEAK.length - 1)
  const maxRise = level === 0 ? 1 : 2
  const maxPeak = Math.min(MAX_PEAK[level], rows - 2)

  // 1. Zonen, die flach bleiben müssen: Start, Ende und rund um jedes Hindernis/Portal.
  //    Ein Ereignis mit Ankunftszeit t0 steht bei Weltpixel t0 * SCROLL_SPEED + Spielerposition (120).
  const reserved = new Array<boolean>(columns).fill(false)
  const reserve = (from: number, to: number) => {
    for (let c = Math.max(0, from); c <= Math.min(columns - 1, to); c++) reserved[c] = true
  }
  reserve(0, START_FLAT - 1)
  reserve(columns - END_FLAT, columns - 1)
  for (const event of LEVELS[levelIndex]?.events ?? []) {
    const center = Math.round((event.t0 * SCROLL_SPEED + 120) / BLOCK_SIZE)
    if (event.kind === 'portal') reserve(center - PORTAL_ZONE, center + PORTAL_ZONE)
    else reserve(center - ZONE_BEFORE, center + ZONE_AFTER)
  }

  // 2. Höhenprofil: in jede freie Lücke passende Berge/Schluchten setzen.
  const heights = new Array<number>(columns).fill(0)
  let col = START_FLAT
  while (col < columns - END_FLAT) {
    if (reserved[col]) {
      col++
      continue
    }
    let next = col
    while (next < columns && !reserved[next]) next++
    const room = next - col - 2 // zwei Spalten Luft vor der Sperrzone

    let piece: number[] = []
    for (let attempt = 0; attempt < 8 && piece.length === 0; attempt++) {
      const cap = Math.max(1, maxPeak - Math.floor(attempt / 2)) // pro Fehlversuch etwas kleiner
      const candidate =
        rng() < CANYON_CHANCE[level]
          ? canyon(randInt(rng, 1, cap), randInt(rng, 1, cap), maxRise, rng)
          : mountain(randInt(rng, 2, Math.max(2, cap)), maxRise, rng)
      if (candidate.length <= room) piece = candidate
    }
    if (piece.length === 0 && room >= 6) piece = mountain(1, maxRise, rng) // kleiner Hügel als Notlösung

    piece.forEach((height, i) => (heights[col + i] = height))
    col += piece.length + randInt(rng, 3, 6) // flaches Zwischenstück
  }

  // 3. Höhenprofil in Blöcke umsetzen.
  const blocks: Block[] = []
  for (let c = 0; c < columns; c++) if (heights[c] > 0) blocks.push(...column(c, heights[c]))
  return blocks
}

/** Oben-links-Ecke eines Blocks in Pixeln: x ab Levelanfang, y im Spielfeld (groundTopY = Oberkante des Bodens). */
export function blockToPixels(block: Block, groundTopY: number): {x: number; y: number} {
  return {x: block.col * BLOCK_SIZE, y: groundTopY - (block.row + 1) * BLOCK_SIZE}
}

/** Fertig erzeugtes Gelände pro Level (einmal beim Import, wie LEVELS). Doppelte und ungültige Blöcke werden entfernt. */
export const TERRAIN: Block[][] = LEVELS.map((level, levelIndex) => {
  const rng = mulberry32(level.index * 7919 + 17)
  const raw = generateTerrain({levelIndex, columns: LEVEL_COLUMNS, rows: TERRAIN_ROWS, rng})

  const seen = new Set<string>()
  return raw.filter(({col, row}) => {
    const valid = Number.isInteger(col) && Number.isInteger(row) && col >= 0 && col < LEVEL_COLUMNS && row >= 0 && row < TERRAIN_ROWS
    if (!valid) return false
    const key = `${col},${row}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})
