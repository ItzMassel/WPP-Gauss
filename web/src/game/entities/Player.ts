import Phaser from 'phaser'
import {
  GRAVITY_Y,
  HECHT_GLIDE_ALTITUDE,
  HECHT_GLIDE_DURATION,
  HECHT_HEIGHT,
  JUMP_SPEED,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
} from '../data/physics'

export type PlayerState = 'run' | 'jump' | 'hecht'

// Platzhalter-Farben, bis echte Sprites geliefert werden.
const COLOR: Record<PlayerState, number> = {
  run: 0x1a3a5c,
  jump: 0x2a5a8c,
  hecht: 0xc9a84c,
}

export class Player {
  readonly rect: Phaser.GameObjects.Rectangle
  readonly body: Phaser.Physics.Arcade.Body
  state: PlayerState = 'run'

  private readonly scene: Phaser.Scene
  private readonly groundTopY: number

  constructor(scene: Phaser.Scene, x: number, groundTopY: number) {
    this.scene = scene
    this.groundTopY = groundTopY

    this.rect = scene.add.rectangle(x, groundTopY - PLAYER_HEIGHT / 2, PLAYER_WIDTH, PLAYER_HEIGHT, COLOR.run)
    scene.physics.add.existing(this.rect)
    this.body = this.rect.body as Phaser.Physics.Arcade.Body
    this.body.setGravityY(GRAVITY_Y)
    this.body.setSize(PLAYER_WIDTH, PLAYER_HEIGHT)
    this.body.setCollideWorldBounds(true)
  }

  get isGrounded(): boolean {
    return this.body.blocked.down || this.body.touching.down
  }

  jump(): void {
    if (this.isGrounded) {
      this.body.setVelocityY(-JUMP_SPEED)
      this.setState('jump')
    } else if (this.state === 'jump') {
      this.hecht()
    }
  }

  private hecht(): void {
    this.setState('hecht')
    this.body.setAllowGravity(false)
    this.body.setVelocityY(0)
    this.body.setSize(PLAYER_HEIGHT * 0.7, HECHT_HEIGHT)
    this.rect.y = this.groundTopY - HECHT_GLIDE_ALTITUDE - HECHT_HEIGHT / 2
    this.rect.setAngle(0)

    // Dreht sich beim Hechten um volle 90°, bis er (nach dem Gleitflug) am Boden aufkommt.
    const fallTime = Math.sqrt((2 * HECHT_GLIDE_ALTITUDE) / GRAVITY_Y)
    const totalDuration = HECHT_GLIDE_DURATION + fallTime
    this.scene.tweens.add({
      targets: this.rect,
      angle: 90,
      duration: totalDuration * 1000,
      ease: 'Linear',
    })

    this.scene.time.delayedCall(HECHT_GLIDE_DURATION * 1000, () => {
      if (this.state === 'hecht') {
        this.body.setAllowGravity(true)
      }
    })
  }

  reset(x: number): void {
    this.scene.tweens.killTweensOf(this.rect)
    this.rect.setPosition(x, this.groundTopY - PLAYER_HEIGHT / 2)
    this.rect.setAngle(0)
    this.body.setVelocity(0, 0)
    this.body.setAllowGravity(true)
    this.body.setSize(PLAYER_WIDTH, PLAYER_HEIGHT)
    this.setState('run')
  }

  private setState(state: PlayerState): void {
    this.state = state
    this.rect.setFillStyle(COLOR[state])
  }

  update(): void {
    if (this.isGrounded && this.state !== 'run') {
      this.scene.tweens.killTweensOf(this.rect)
      this.setState('run')
      this.rect.setAngle(0)
      this.body.setAllowGravity(true)
      this.body.setSize(PLAYER_WIDTH, PLAYER_HEIGHT)
    }
  }
}
