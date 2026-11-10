import Phaser from 'phaser'
import {
  GROUND_OBSTACLE_HEIGHT,
  LOWBEAM_CLEARANCE,
  OBSTACLE_WIDTH,
  OVERHEAD_CLEARANCE,
  SCROLL_SPEED,
  type ObstacleKind,
} from '../data/physics'

export type ObstacleType = ObstacleKind

interface ObstacleSpec {
  width: number
  height: number
  color: number
  /** Freier Bodenabstand unter der Hindernis-Unterkante, in px. */
  clearance: number
}

// Platzhalter-Farben je Hindernistyp, bis echte Sprites geliefert werden (Bodenhindernis nutzt bereits den Spike-Sprite).
const SPEC: Record<ObstacleType, ObstacleSpec> = {
  // Bodenhindernis: muss übersprungen werden.
  ground: {width: OBSTACLE_WIDTH.ground, height: GROUND_OBSTACLE_HEIGHT, color: 0x6b4a2f, clearance: 0},
  // Hochhindernis: passt man im normalen Lauf locker drunter durch — beim Springen stößt man an.
  overhead: {width: OBSTACLE_WIDTH.overhead, height: 260, color: 0x3b4a5c, clearance: OVERHEAD_CLEARANCE},
  // Niedriges Hindernis: dafür muss man in der Luft hechten (Doppelsprung), um flach darunter durchzukommen.
  lowbeam: {width: OBSTACLE_WIDTH.lowbeam, height: 260, color: 0xb0473a, clearance: LOWBEAM_CLEARANCE},
}

export class Obstacle {
  readonly type: ObstacleType
  readonly rect: Phaser.GameObjects.Rectangle
  readonly body: Phaser.Physics.Arcade.Body
  hit = false
  private readonly scene: Phaser.Scene
  private readonly sprite?: Phaser.GameObjects.Image

  constructor(scene: Phaser.Scene, type: ObstacleType, x: number, groundTopY: number) {
    this.type = type
    this.scene = scene
    const spec = SPEC[type]
    const bottomY = groundTopY - spec.clearance
    const centerY = bottomY - spec.height / 2

    this.rect = scene.add.rectangle(x, centerY, spec.width, spec.height, spec.color)
    scene.physics.add.existing(this.rect)
    this.body = this.rect.body as Phaser.Physics.Arcade.Body
    this.body.setAllowGravity(false)
    this.body.setVelocityX(-SCROLL_SPEED)
    this.body.setSize(spec.width, spec.height)

    if (type === 'ground') {
      // Das Rechteck bleibt als unsichtbare Hitbox; der Spike-Sprite folgt ihm nach dem Physik-Schritt.
      this.rect.setVisible(false)
      this.sprite = scene.add.image(x, bottomY, 'spike').setOrigin(0.5, 1)
      this.sprite.setScale(spec.height / this.sprite.height)
      scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncSprite, this)
      this.syncSprite()
    }
  }

  private syncSprite(): void {
    this.sprite?.setX(this.rect.x)
  }

  get isOffscreen(): boolean {
    return this.rect.x < -80
  }

  destroy(): void {
    if (this.sprite) {
      this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncSprite, this)
      this.sprite.destroy()
    }
    this.rect.destroy()
  }
}
