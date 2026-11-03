import Phaser from 'phaser'
import {PORTAL_WIDTH, SCROLL_SPEED} from '../data/physics'

const WIDTH = PORTAL_WIDTH
const HEIGHT = 90

export class Portal {
  readonly rect: Phaser.GameObjects.Image
  readonly body: Phaser.Physics.Arcade.Body
  solved = false

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const portalImage = scene.textures.get('gauss-npc').getSourceImage() as HTMLImageElement
    const aspect = portalImage.width / portalImage.height
    this.rect = scene.add.image(x, y, 'gauss-npc')
    this.rect.setDisplaySize(HEIGHT * aspect, HEIGHT)
    scene.physics.add.existing(this.rect)
    this.body = this.rect.body as Phaser.Physics.Arcade.Body
    this.body.setAllowGravity(false)
    this.body.setVelocityX(-SCROLL_SPEED)
    this.body.setSize(WIDTH, HEIGHT)

  }

  get isOffscreen(): boolean {
    return this.rect.x < -WIDTH
  }

  destroy(): void {
    this.rect.destroy()
  }
}
