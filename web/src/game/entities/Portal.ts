import Phaser from 'phaser'
import {PORTAL_WIDTH, SCROLL_SPEED} from '../data/physics'

const WIDTH = PORTAL_WIDTH
const HEIGHT = 90

// Platzhalter: pulsierender goldener Ring statt animiertem Sprite.
export class Portal {
  readonly rect: Phaser.GameObjects.Rectangle
  readonly body: Phaser.Physics.Arcade.Body
  solved = false

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.rect = scene.add.rectangle(x, y, WIDTH, HEIGHT, 0xc9a84c, 0.25)
    this.rect.setStrokeStyle(3, 0xc9a84c, 1)
    scene.physics.add.existing(this.rect)
    this.body = this.rect.body as Phaser.Physics.Arcade.Body
    this.body.setAllowGravity(false)
    this.body.setVelocityX(-SCROLL_SPEED)
    this.body.setSize(WIDTH, HEIGHT)

    scene.tweens.add({
      targets: this.rect,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  get isOffscreen(): boolean {
    return this.rect.x < -WIDTH
  }

  destroy(): void {
    this.rect.destroy()
  }
}
