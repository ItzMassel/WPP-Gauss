import Phaser from 'phaser'
import {PORTAL_WIDTH, SCROLL_SPEED} from '../data/physics'

const WIDTH = PORTAL_WIDTH
const HEIGHT = 90

export class Portal {
  readonly rect: Phaser.GameObjects.Image
  readonly body: Phaser.Physics.Arcade.Body
  solved = false

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const portalImage = scene.textures.get('portal').getSourceImage() as HTMLImageElement
    const aspect = portalImage.width / portalImage.height
    this.rect = scene.add.image(x, y, 'portal')
    this.rect.setDisplaySize(HEIGHT * aspect, HEIGHT)
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
