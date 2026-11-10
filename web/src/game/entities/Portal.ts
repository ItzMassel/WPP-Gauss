import Phaser from 'phaser'
import {PORTAL_WIDTH, SCROLL_SPEED} from '../data/physics'

const WIDTH = PORTAL_WIDTH
const HEIGHT = 90
/** Höhe der Hitbox – deutlich höher als jeder Sprung. */
const WALL_HEIGHT = 500

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

    // Unsichtbare Wand: Die Hitbox reicht vom Boden bis über den oberen Spielfeldrand, damit man
    // den Lehrer weder überspringen noch überfliegen kann – die Frage ist unumgänglich.
    const sx = this.rect.scaleX
    const sy = this.rect.scaleY
    const top = y + HEIGHT / 2 - WALL_HEIGHT // y ist die Bildmitte, das Bild steht auf dem Boden
    this.body.setSize(WIDTH / sx, WALL_HEIGHT / sy, false)
    this.body.setOffset((this.rect.displayWidth / 2 - WIDTH / 2) / sx, (top - (y - HEIGHT / 2)) / sy)
  }

  get isOffscreen(): boolean {
    return this.rect.x < -WIDTH
  }

  destroy(): void {
    this.rect.destroy()
  }
}
