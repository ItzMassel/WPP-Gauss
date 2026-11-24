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
export function generateTerrain({levelIndex, columns, rows, rng}: TerrainContext): Block[] {
  const blocks: Block[] = []

  // vvvv hier programmieren vvvv

  void levelIndex
  void columns
  void rows
  void rng
  // TEMP-TEST
  for (let c = 15; c <= 20; c++) blocks.push(...column(c, 1))
  for (let c = 21; c <= 26; c++) blocks.push(...column(c, 2))
  for (let c = 27; c <= 32; c++) blocks.push(...column(c, 1))
  blocks.push(...rect(36, 3, 4, 1))
  for (let c = 50; c <= 52; c++) blocks.push(...column(c, 4))

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
