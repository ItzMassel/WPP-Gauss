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

const RUN_ANIM_KEY = 'player-run'
const RUN_FRAME_RATE = 10
/** Sichtbare Höhe der Grafik, etwas größer als die Hitbox, damit Gauß nicht gestaucht wirkt. */
const VISUAL_HEIGHT = PLAYER_HEIGHT * 1.2
/** Sichtbare Anhebung ggü. der Hitbox, damit Gauß auf dem Gras steht statt darin zu versinken. */
const VISUAL_LIFT = 2

export class Player {
  /** Unsichtbare Hitbox, treibt die komplette Physik — von der Grafik komplett entkoppelt. */
  readonly rect: Phaser.GameObjects.Rectangle
  readonly body: Phaser.Physics.Arcade.Body
  state: PlayerState = 'run'

  private readonly scene: Phaser.Scene
  private readonly groundTopY: number
  private readonly sprite: Phaser.GameObjects.Sprite

  constructor(scene: Phaser.Scene, x: number, groundTopY: number) {
    this.scene = scene
    this.groundTopY = groundTopY

    this.rect = scene.add.rectangle(x, groundTopY - PLAYER_HEIGHT / 2, PLAYER_WIDTH, PLAYER_HEIGHT, 0x000000, 0)
    scene.physics.add.existing(this.rect)
    this.body = this.rect.body as Phaser.Physics.Arcade.Body
    this.body.setGravityY(GRAVITY_Y)
    this.body.setSize(PLAYER_WIDTH, PLAYER_HEIGHT)
    this.body.setCollideWorldBounds(true)

    if (!scene.anims.exists(RUN_ANIM_KEY)) {
      scene.anims.create({
        key: RUN_ANIM_KEY,
        frames: [1, 2, 3, 4, 5].map((i) => ({key: `player-${i}`})),
        frameRate: RUN_FRAME_RATE,
        repeat: -1,
      })
    }

    const frameImage = scene.textures.get('player-1').getSourceImage() as HTMLImageElement
    const aspect = frameImage.width / frameImage.height

    // Reine Deko-Grafik ohne eigene Physik — folgt der Hitbox in update().
    this.sprite = scene.add.sprite(x, groundTopY, 'player-1').setOrigin(0.5, 1)
    this.sprite.setDisplaySize(VISUAL_HEIGHT * aspect, VISUAL_HEIGHT)
    this.sprite.setDepth(1) // vor Deko-Elementen wie den Pflanzen
    // Läuft dauerhaft weiter, unabhängig von Sprung/Hecht — die Animation stoppt nie.
    this.sprite.play(RUN_ANIM_KEY)
    this.syncSprite()
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
  }

  /** Zieht die Deko-Grafik auf die aktuelle Hitbox-Position/-Rotation, mit leichtem Boden-Lift. */
  private syncSprite(): void {
    this.sprite.x = this.rect.x
    this.sprite.y = this.rect.y + PLAYER_HEIGHT / 2 - VISUAL_LIFT
    this.sprite.angle = this.rect.angle
  }

  update(): void {
    if (this.isGrounded && this.state !== 'run') {
      this.scene.tweens.killTweensOf(this.rect)
      this.setState('run')
      this.rect.setAngle(0)
      this.body.setAllowGravity(true)
      this.body.setSize(PLAYER_WIDTH, PLAYER_HEIGHT)
    }
    this.syncSprite()
  }
}
