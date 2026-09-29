import Phaser from 'phaser'
import {Player} from '../entities/Player'
import {Portal} from '../entities/Portal'
import {Obstacle} from '../entities/Obstacle'
import {randomQuestion, type MathQuestion} from '../data/questions'
import {LEVELS, LEVEL_DURATION, type LevelEvent} from '../data/levels'
import {KNOCKBACK_DISTANCE, MAX_HP, SCROLL_SPEED, SPEED_ACCEL} from '../data/physics'

export const GAME_WIDTH = 800
export const GAME_HEIGHT = 400
const GROUND_HEIGHT = 48
/** Grasstreifen an der Bodenoberkante; der Rest darunter ist die Erde-Textur. */
const GRASS_STRIP_HEIGHT = 14
const GROUND_TOP_Y = GAME_HEIGHT - GROUND_HEIGHT
const PLAYER_X = 120
const SPAWN_X = GAME_WIDTH + 40
/** Höhe, auf die Deko-Pflanzen skaliert werden, sitzen mittig auf dem Grasstreifen. */
const PLANT_HEIGHT = 38
/** Zufälliger Abstand zwischen Deko-Pflanzen, in Sekunden. */
const PLANT_GAP_MIN = 2.5
const PLANT_GAP_MAX = 5.5
/** Sekunden, die ein Hindernis vom Spawn am rechten Rand bis zum Spieler braucht. */
const SPAWN_LEAD = (SPAWN_X - PLAYER_X) / SCROLL_SPEED

export const EVT_QUESTION = 'gauss-runner:question'
export const EVT_ANSWER = 'gauss-runner:answer'
export const EVT_LEVEL = 'gauss-runner:level'
export const EVT_HP = 'gauss-runner:hp'

export interface LevelBanner {
  index: number
  name: string
  difficulty: string
  restarted: boolean
}

export class GameScene extends Phaser.Scene {
  private player!: Player
  private obstacles: Obstacle[] = []
  private portals: Portal[] = []
  private paused = false
  private activePortal: Portal | null = null

  private levelIndex = 0
  private levelElapsed = 0
  private eventPointer = 0

  private plants: Phaser.GameObjects.Image[] = []
  private plantTimer = Phaser.Math.Between(PLANT_GAP_MIN * 1000, PLANT_GAP_MAX * 1000) / 1000

  private hp = MAX_HP
  /** Aktuelle Welt-/Laufgeschwindigkeit; sinkt bei einer Kollision auf 0 und beschleunigt wieder hoch. */
  private worldSpeed = SCROLL_SPEED

  constructor() {
    super('GameScene')
  }

  preload(): void {
    this.load.image('grass', 'grass.jpg')
    this.load.image('dirt', 'dirt.jpg')
    this.load.image('plant', 'plant.png')
    this.load.image('portal', 'portal.jpg')
    for (let i = 1; i <= 5; i++) this.load.image(`player-${i}`, `player/${i}.png`)
  }

  create(): void {
    this.cameras.main.setBackgroundColor(LEVELS[0].background)

    // Boden: dünner Grasstreifen oben (nur der grüne Teil der grass.jpg-Textur),
    // darunter die gekachelte dirt.jpg-Textur bis zum unteren Rand.
    const grassImage = this.textures.get('grass').getSourceImage() as HTMLImageElement
    const grassCropHeight = Math.round(grassImage.height * (160 / 639))
    this.textures.get('grass').add('top', 0, 0, 0, grassImage.width, grassCropHeight)

    const grassTileScale = GRASS_STRIP_HEIGHT / grassCropHeight
    const grassY = GROUND_TOP_Y + GRASS_STRIP_HEIGHT / 2
    const grassSprite = this.add.tileSprite(GAME_WIDTH / 2, grassY, GAME_WIDTH * 2, GRASS_STRIP_HEIGHT, 'grass', 'top')
    grassSprite.setTileScale(grassTileScale, grassTileScale)

    const dirtHeight = GROUND_HEIGHT - GRASS_STRIP_HEIGHT
    const dirtImage = this.textures.get('dirt').getSourceImage() as HTMLImageElement
    const dirtTileScale = dirtHeight / dirtImage.height
    const dirtY = GROUND_TOP_Y + GRASS_STRIP_HEIGHT + dirtHeight / 2
    const dirtSprite = this.add.tileSprite(GAME_WIDTH / 2, dirtY, GAME_WIDTH * 2, dirtHeight, 'dirt')
    dirtSprite.setTileScale(dirtTileScale, dirtTileScale)

    const ground = this.physics.add.staticGroup()
    ground.add(grassSprite)
    ground.add(dirtSprite)
    ;(grassSprite.body as Phaser.Physics.Arcade.StaticBody).setSize(GAME_WIDTH * 2, GRASS_STRIP_HEIGHT)
    ;(dirtSprite.body as Phaser.Physics.Arcade.StaticBody).setSize(GAME_WIDTH * 2, dirtHeight)

    this.player = new Player(this, PLAYER_X, GROUND_TOP_Y)
    this.physics.add.collider(this.player.rect, ground)

    this.input.keyboard?.on('keydown-SPACE', () => this.onJumpInput())
    this.input.on('pointerdown', () => this.onJumpInput())

    this.game.events.on(EVT_ANSWER, this.onAnswer, this)
    this.events.once('shutdown', () => this.game.events.off(EVT_ANSWER, this.onAnswer, this))

    this.announceLevel(false)
    this.game.events.emit(EVT_HP, this.hp)
  }

  private onJumpInput(): void {
    if (this.paused) return
    this.player.jump()
  }

  private announceLevel(restarted: boolean): void {
    const level = LEVELS[this.levelIndex]
    const banner: LevelBanner = {index: this.levelIndex, name: level.name, difficulty: level.difficulty, restarted}
    this.game.events.emit(EVT_LEVEL, banner)
  }

  /** Rein dekorative Pflanze, ohne Kollision — sitzt oben auf dem Grasstreifen. */
  private spawnPlant(): void {
    const scale = PLANT_HEIGHT / (this.textures.get('plant').getSourceImage() as HTMLImageElement).height
    const plant = this.add.image(SPAWN_X, GROUND_TOP_Y, 'plant').setOrigin(0.5, 1).setScale(scale)
    plant.setDepth(-1) // hinter dem Spieler
    this.plants.push(plant)
  }

  private spawnEvent(event: LevelEvent): void {
    if (event.kind === 'portal') {
      const portal = new Portal(this, SPAWN_X, GAME_HEIGHT - GROUND_HEIGHT - 45)
      this.portals.push(portal)
      this.physics.add.overlap(this.player.rect, portal.rect, () => this.hitPortal(portal))
    } else {
      const obstacle = new Obstacle(this, event.kind, SPAWN_X, GROUND_TOP_Y)
      this.obstacles.push(obstacle)
      this.physics.add.overlap(this.player.rect, obstacle.rect, () => this.hitObstacle(obstacle))
    }
  }

  private hitObstacle(obstacle: Obstacle): void {
    if (this.paused || obstacle.hit) return
    obstacle.hit = true

    this.hp -= 1
    this.game.events.emit(EVT_HP, this.hp)
    this.bounceBack()

    if (this.hp <= 0) {
      this.die()
    } else {
      this.cameras.main.shake(160, 0.015)
      this.cameras.main.flash(120, 176, 71, 58)
    }
  }

  /** Stößt Hindernisse/Portale ein Stück zurück ("drei Blöcke") und lässt die Welt neu anlaufen. */
  private bounceBack(): void {
    for (const obstacle of this.obstacles) obstacle.rect.x += KNOCKBACK_DISTANCE
    for (const portal of this.portals) portal.rect.x += KNOCKBACK_DISTANCE
    this.levelElapsed = Math.max(0, this.levelElapsed - KNOCKBACK_DISTANCE / SCROLL_SPEED)
    this.worldSpeed = 0
  }

  private die(): void {
    this.paused = true
    this.physics.pause()
    this.cameras.main.shake(260, 0.025)
    this.cameras.main.flash(220, 176, 71, 58)
    this.time.delayedCall(700, () => this.respawnAtCheckpoint())
  }

  private respawnAtCheckpoint(): void {
    for (const obstacle of this.obstacles) obstacle.destroy()
    this.obstacles = []
    for (const portal of this.portals) portal.destroy()
    this.portals = []
    this.activePortal = null
    for (const plant of this.plants) plant.destroy()
    this.plants = []

    this.levelElapsed = 0
    this.eventPointer = 0
    this.worldSpeed = SCROLL_SPEED

    this.hp = MAX_HP
    this.game.events.emit(EVT_HP, this.hp)

    this.player.reset(PLAYER_X)

    this.physics.resume()
    this.paused = false
    this.announceLevel(true)
  }

  private hitPortal(portal: Portal): void {
    if (this.paused || portal.solved) return
    portal.solved = true
    this.activePortal = portal
    this.paused = true
    this.physics.pause()
    const question: MathQuestion = randomQuestion()
    this.game.events.emit(EVT_QUESTION, question)
  }

  private onAnswer(correct: boolean): void {
    if (!this.paused || !this.activePortal) return
    if (!correct) return
    this.paused = false
    this.physics.resume()
    this.activePortal.destroy()
    this.portals = this.portals.filter((p) => p !== this.activePortal)
    this.activePortal = null
  }

  private advanceLevel(): void {
    for (const obstacle of this.obstacles) obstacle.destroy()
    this.obstacles = []
    for (const portal of this.portals) portal.destroy()
    this.portals = []
    this.activePortal = null
    for (const plant of this.plants) plant.destroy()
    this.plants = []

    this.levelIndex = (this.levelIndex + 1) % LEVELS.length
    this.levelElapsed = 0
    this.eventPointer = 0

    this.cameras.main.setBackgroundColor(LEVELS[this.levelIndex].background)
    this.announceLevel(false)
  }

  update(_time: number, deltaMs: number): void {
    if (this.paused) return
    this.player.update()

    const dt = deltaMs / 1000
    if (this.worldSpeed < SCROLL_SPEED) {
      this.worldSpeed = Math.min(SCROLL_SPEED, this.worldSpeed + SPEED_ACCEL * dt)
    }
    for (const obstacle of this.obstacles) obstacle.body.setVelocityX(-this.worldSpeed)
    for (const portal of this.portals) portal.body.setVelocityX(-this.worldSpeed)
    for (const plant of this.plants) plant.x -= this.worldSpeed * dt

    this.plantTimer -= dt
    if (this.plantTimer <= 0) {
      this.spawnPlant()
      this.plantTimer = Phaser.Math.FloatBetween(PLANT_GAP_MIN, PLANT_GAP_MAX)
    }

    const level = LEVELS[this.levelIndex]
    this.levelElapsed += dt

    while (this.eventPointer < level.events.length) {
      const event = level.events[this.eventPointer]
      if (event.t0 - SPAWN_LEAD > this.levelElapsed) break
      this.spawnEvent(event)
      this.eventPointer++
    }

    this.obstacles = this.obstacles.filter((obstacle) => {
      if (obstacle.isOffscreen) {
        obstacle.destroy()
        return false
      }
      return true
    })

    this.portals = this.portals.filter((portal) => {
      if (portal.isOffscreen) {
        portal.destroy()
        return false
      }
      return true
    })

    this.plants = this.plants.filter((plant) => {
      if (plant.x < -PLANT_HEIGHT) {
        plant.destroy()
        return false
      }
      return true
    })

    if (this.levelElapsed >= LEVEL_DURATION) {
      this.advanceLevel()
    }
  }
}
