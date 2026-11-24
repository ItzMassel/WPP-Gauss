import Phaser from 'phaser'
import {BLOCK_SIZE} from '../data/physics'
import {TERRAIN, TERRAIN_ROWS} from '../data/terrain'

/** Anteil der grass.jpg-Textur (von oben), der den grünen Grasstreifen zeigt. */
export const GRASS_CROP_RATIO = 160 / 639

/** Toleranz in px, damit Kanten, die sich nur berühren, nicht als Überlappung zählen. */
const EPS = 1

const TEX_DIRT = 'terrain-dirt'
const TEX_GRASS = 'terrain-grass'

export interface TerrainOptions {
  /** Oberkante des flachen Basisbodens (Reihe 0 steht direkt darauf). */
  groundTopY: number
  /** Breite des sichtbaren Spielfelds in px. */
  viewWidth: number
  /** Höhe des Grasstreifens oben auf einem Block in px. */
  grassStripHeight: number
}

/**
 * Das Gelände eines Levels zur Laufzeit: zeichnet die sichtbaren Blöcke und beantwortet
 * Kollisionsfragen. Die Welt scrollt nach links, Gauß bleibt in x stehen — `scroll` ist die
 * Strecke in px, die seit Levelbeginn zurückgelegt wurde. Block (col, row) liegt auf dem
 * Bildschirm bei x = col * BLOCK_SIZE - scroll.
 */
export class Terrain {
  scroll = 0

  private readonly groundTopY: number
  private readonly viewWidth: number
  /** Eine Bitmaske pro Spalte: Bit r gesetzt = Block in Reihe r. */
  private columns: number[] = []
  private readonly pool: Phaser.GameObjects.Image[] = []
  private readonly scene: Phaser.Scene

  constructor(scene: Phaser.Scene, {groundTopY, viewWidth, grassStripHeight}: TerrainOptions) {
    this.scene = scene
    this.groundTopY = groundTopY
    this.viewWidth = viewWidth
    this.bakeTextures(grassStripHeight)
  }

  /** Lädt das Gelände von Level `levelIndex` und setzt das Scrollen zurück an den Anfang. */
  load(levelIndex: number): void {
    const columns: number[] = []
    for (const {col, row} of TERRAIN[levelIndex] ?? []) columns[col] = (columns[col] ?? 0) | (1 << row)
    this.columns = columns
    this.scroll = 0
    this.render()
  }

  /** Oberkante (y) der höchsten festen Fläche im Bereich [left, right], die auf oder unter `belowY` liegt. Sonst der Basisboden. */
  surfaceY(left: number, right: number, belowY = -Infinity): number {
    let best = this.groundTopY
    const [first, last] = this.colRange(left, right)
    for (let col = first; col <= last; col++) {
      const mask = this.mask(col)
      for (let row = TERRAIN_ROWS - 1; row >= 0; row--) {
        if (!(mask & (1 << row))) continue
        const top = this.rowTop(row)
        if (top < belowY) continue // Block liegt über `belowY` — der zählt nicht als Boden
        best = Math.min(best, top)
        break
      }
    }
    return best
  }

  /**
   * Unterkante (y) des tiefsten Blocks im Bereich [left, right], dessen Unterseite auf oder über `aboveY` liegt
   * — die "Decke" über dem Kopf. Gibt -Infinity zurück, wenn keine existiert.
   */
  ceilingY(left: number, right: number, aboveY: number): number {
    let best = -Infinity
    const [first, last] = this.colRange(left, right)
    for (let col = first; col <= last; col++) {
      const mask = this.mask(col)
      for (let row = 0; row < TERRAIN_ROWS; row++) {
        if (!(mask & (1 << row))) continue
        const bottom = this.rowTop(row) + BLOCK_SIZE
        if (bottom > aboveY) continue
        best = Math.max(best, bottom)
        break
      }
    }
    return best
  }

  /** Oberkante des zusammenhängenden Bodens (ab Reihe 0 nach oben) im Bereich — ignoriert schwebende Plattformen. */
  groundY(left: number, right: number): number {
    let height = 0
    const [first, last] = this.colRange(left, right)
    for (let col = first; col <= last; col++) {
      const mask = this.mask(col)
      let run = 0
      while (run < TERRAIN_ROWS && mask & (1 << run)) run++
      height = Math.max(height, run)
    }
    return this.groundTopY - height * BLOCK_SIZE
  }

  /** True, wenn das Rechteck (Bildschirm-Koordinaten) einen Block überlappt. */
  overlaps(left: number, right: number, top: number, bottom: number): boolean {
    const rowMin = Math.max(0, Math.floor((this.groundTopY - bottom + EPS) / BLOCK_SIZE))
    const rowMax = Math.min(TERRAIN_ROWS - 1, Math.ceil((this.groundTopY - top - EPS) / BLOCK_SIZE) - 1)
    if (rowMax < rowMin) return false
    const rows = ((1 << (rowMax + 1)) - 1) & ~((1 << rowMin) - 1)

    const [first, last] = this.colRange(left, right)
    for (let col = first; col <= last; col++) {
      if (this.mask(col) & rows) return true
    }
    return false
  }

  /** Positioniert die Block-Sprites für die gerade sichtbaren Spalten. */
  render(): void {
    const first = Math.floor(this.scroll / BLOCK_SIZE)
    const last = Math.floor((this.scroll + this.viewWidth) / BLOCK_SIZE)
    let used = 0

    for (let col = first; col <= last; col++) {
      const mask = this.mask(col)
      if (!mask) continue
      const x = Math.round(col * BLOCK_SIZE - this.scroll)
      for (let row = 0; row < TERRAIN_ROWS; row++) {
        if (!(mask & (1 << row))) continue
        const sprite = (this.pool[used] ??= this.scene.add.image(0, 0, TEX_DIRT).setOrigin(0, 0))
        const texture = mask & (1 << (row + 1)) ? TEX_DIRT : TEX_GRASS
        if (sprite.texture.key !== texture) sprite.setTexture(texture)
        sprite.setPosition(x, this.rowTop(row)).setVisible(true)
        used++
      }
    }
    for (let i = used; i < this.pool.length; i++) this.pool[i].setVisible(false)
  }

  private mask(col: number): number {
    return this.columns[col] ?? 0
  }

  /** Oberkante (y) von Reihe `row`. */
  private rowTop(row: number): number {
    return this.groundTopY - (row + 1) * BLOCK_SIZE
  }

  /** Spalten, die den Bildschirm-Bereich [left, right] (mit kleiner Toleranz) überdecken. */
  private colRange(left: number, right: number): [number, number] {
    return [Math.floor((left + EPS + this.scroll) / BLOCK_SIZE), Math.floor((right - EPS + this.scroll) / BLOCK_SIZE)]
  }

  /** Backt aus dirt.jpg/grass.jpg zwei Block-Texturen: reine Erde und Erde mit Grasstreifen oben. */
  private bakeTextures(grassStripHeight: number): void {
    const textures = this.scene.textures
    const dirt = textures.get('dirt').getSourceImage() as HTMLImageElement
    const grass = textures.get('grass').getSourceImage() as HTMLImageElement
    const grassCropHeight = Math.round(grass.height * GRASS_CROP_RATIO)

    for (const [key, withGrass] of [[TEX_DIRT, false], [TEX_GRASS, true]] as const) {
      if (textures.exists(key)) textures.remove(key)
      const canvas = textures.createCanvas(key, BLOCK_SIZE, BLOCK_SIZE)
      if (!canvas) continue
      const ctx = canvas.getContext()

      const dirtWidth = dirt.width * (BLOCK_SIZE / dirt.height)
      for (let x = 0; x < BLOCK_SIZE; x += dirtWidth) ctx.drawImage(dirt, x, 0, dirtWidth, BLOCK_SIZE)

      if (withGrass) {
        const grassWidth = grass.width * (grassStripHeight / grassCropHeight)
        for (let x = 0; x < BLOCK_SIZE; x += grassWidth) {
          ctx.drawImage(grass, 0, 0, grass.width, grassCropHeight, x, 0, grassWidth, grassStripHeight)
        }
      }
      canvas.refresh()
    }
  }
}
