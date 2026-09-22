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
const GROUND_TOP_Y = GAME_HEIGHT - GROUND_HEIGHT
const PLAYER_X = 120
const SPAWN_X = GAME_WIDTH + 40
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

  private hp = MAX_HP
  /** Aktuelle Welt-/Laufgeschwindigkeit; sinkt bei einer Kollision auf 0 und beschleunigt wieder hoch. */
  private worldSpeed = SCROLL_SPEED

  constructor() {
    super('GameScene')
  }

  create(): void {
    this.cameras.main.setBackgroundColor(LEVELS[0].background)

    // Boden: Platzhalter-Streifen statt Tile-Sprites (Gras oben, Erde darunter)
    const groundY = GAME_HEIGHT - GROUND_HEIGHT / 2
    const grass = this.add.rectangle(GAME_WIDTH / 2, groundY - GROUND_HEIGHT / 2 + 6, GAME_WIDTH * 2, 12, 0x3f7d3a)
    const erde = this.add.rectangle(GAME_WIDTH / 2, groundY + 6, GAME_WIDTH * 2, GROUND_HEIGHT - 12, 0x5c4326)
    const ground = this.physics.add.staticGroup()
    ground.add(grass)
    ground.add(erde)
    ;(grass.body as Phaser.Physics.Arcade.StaticBody).setSize(GAME_WIDTH * 2, 12)
    ;(erde.body as Phaser.Physics.Arcade.StaticBody).setSize(GAME_WIDTH * 2, GROUND_HEIGHT - 12)

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

    if (this.levelElapsed >= LEVEL_DURATION) {
      this.advanceLevel()
    }
  }
}
