import Phaser from 'phaser'
import {
  GRAVITY_Y,
  HECHT_GLIDE_ALTITUDE,
  HECHT_GLIDE_DURATION,
  HECHT_HEIGHT,
  HECHT_HOP_ALTITUDE,
  HECHT_HOP_LOOKAHEAD,
  HECHT_HOP_SPEED,
  HECHT_LENGTH,
  HECHT_ROTATE_DURATION,
  HECHT_SLIDE_TIME,
  HECHT_STAND_DURATION,
  JUMP_SPEED,
  PLAYER_HEIGHT,
  PLAYER_WIDTH,
} from '../data/physics'

export type PlayerState = 'run' | 'jump' | 'hecht'
/** Waagerechter Bereich eines Hindernisses, in Welt-Koordinaten. */
export interface HazardSpan {
  left: number
  right: number
}

/** glide: flach, die Welt rast vorbei · fall: Gleitflug zu Ende, Gauß sinkt · slide: Bauchlandung, rutscht kurz. */
type HechtPhase = 'glide' | 'fall' | 'slide'

const RUN_ANIM_KEY = 'player-run'
const RUN_FRAME_RATE = 10
/** Sichtbare Höhe der Grafik, etwas größer als die Hitbox, damit Gauß nicht gestaucht wirkt. */
const VISUAL_HEIGHT = PLAYER_HEIGHT * 1.2
/** Sichtbare Anhebung ggü. der Hitbox, damit Gauß auf dem Gras steht statt darin zu versinken. */
const VISUAL_LIFT = 2

/** Grafik-Maße im flachen Hecht (nach 90°-Drehung: Dicke = senkrecht, Länge = waagerecht). */
const LIE_THICKNESS = 30
const LIE_LENGTH = 66
/** Leichte Neigung der Grafik in Grad: Kopf sinkt im Gleitflug minimal, im Fallen deutlicher. */
const GLIDE_PITCH = 4
const FALL_PITCH = 14
/** Dauer, in der die Grafik nach dem Hecht-Start vom alten Standort auf die Gleithöhe "stürzt". */
const DIVE_VISUAL_TIME = 0.06
/** Abstand zwischen zwei Speed-Line-Schüben im Gleitflug, in Sekunden. */
const SPEED_LINE_INTERVAL = 0.07
/** So lange darf der Gleitflug maximal verlängert werden, solange Gauß über einem Hindernis schwebt. */
const HOP_GRACE_TIME = 0.25
/** Größter erlaubter Zeitschritt, damit ein Tab-Wechsel keinen Hecht-Ablauf überspringt. */
const MAX_DT = 0.05

export class Player {
  /** Unsichtbare Hitbox, treibt die komplette Physik — von der Grafik komplett entkoppelt. */
  readonly rect: Phaser.GameObjects.Rectangle
  readonly body: Phaser.Physics.Arcade.Body
  state: PlayerState = 'run'

  private readonly scene: Phaser.Scene
  private readonly groundTopY: number
  private readonly sprite: Phaser.GameObjects.Sprite
  private readonly uprightWidth: number
  private readonly getGroundHazards: () => HazardSpan[]

  /** Aktuelle Hitbox-Höhe; die Füße (Unterkante) bleiben beim Umschalten der Hitbox fest. */
  private hitboxHeight = PLAYER_HEIGHT
  private hechtPhase: HechtPhase = 'glide'
  private hechtTime = 0
  private slideTime = 0
  /** 0 = aufrecht, 1 = flach im Hecht; die Grafik blendet dazwischen. */
  private lie = 0
  private pitch = 0
  /** Optischer Versatz nach dem Hecht-Start (Hitbox springt sofort, die Grafik stürzt kurz nach). */
  private visualLagY = 0
  /** Aktuelle Gleithöhe der Hitbox-Unterkante über dem Boden; steigt kurz über Bodenhindernisse. */
  private altitude = HECHT_GLIDE_ALTITUDE
  private speedLineTimer = 0

  /** `getGroundHazards` liefert die Bodenhindernisse (Spikes), über die Gauß hechten darf. */
  constructor(scene: Phaser.Scene, x: number, groundTopY: number, getGroundHazards: () => HazardSpan[]) {
    this.scene = scene
    this.groundTopY = groundTopY
    this.getGroundHazards = getGroundHazards

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
    this.uprightWidth = VISUAL_HEIGHT * (frameImage.width / frameImage.height)

    // Reine Deko-Grafik ohne eigene Physik — folgt der Hitbox in update(). Origin in der Mitte,
    // damit die Drehung im Hecht um den Körperschwerpunkt läuft statt um die Füße.
    this.sprite = scene.add.sprite(x, groundTopY, 'player-1').setOrigin(0.5, 0.5)
    this.sprite.setDepth(1) // vor Deko-Elementen wie den Pflanzen
    // Läuft dauerhaft weiter, unabhängig von Sprung/Hecht — die Animation stoppt nie.
    this.sprite.play(RUN_ANIM_KEY)
    this.syncSprite()
  }

  /** True, solange Gauß flach durch die Luft rast — die Welt scrollt dann schneller. */
  get isGliding(): boolean {
    return this.state === 'hecht' && this.hechtPhase === 'glide'
  }

  get isGrounded(): boolean {
    return this.body.blocked.down || this.body.touching.down
  }

  /**
   * Erster Druck am Boden = Sprung. Jeder Druck in der Luft (egal ob steigend oder fallend)
   * löst den Hecht aus — auch direkt im selben Frame nach dem Absprung.
   */
  jump(): void {
    if (this.state === 'hecht') {
      // Aus dem Bauchrutschen heraus sofort wieder abspringen.
      if (this.hechtPhase === 'slide') {
        this.standUp()
        this.startJump()
      }
      return
    }
    if (this.state === 'jump' || !this.isGrounded) {
      this.hecht()
    } else {
      this.startJump()
    }
  }

  private startJump(): void {
    this.body.setVelocityY(-JUMP_SPEED)
    this.state = 'jump'
  }

  /**
   * Hecht: Hitbox wird flach und lang, Gauß rast flach durch die Luft (die Welt scrollt dabei
   * schneller, siehe GameScene). Er gleitet auf niedriger Höhe, sodass er unter den "lowbeam"
   * passt, und steigt nur über Bodenhindernisse. Die Hitbox springt sofort auf die Gleithöhe,
   * damit das Timing der Level exakt stimmt; nur die Grafik stürzt kurz nach.
   */
  private hecht(): void {
    const oldFeetY = this.rect.y + this.hitboxHeight / 2
    // Liegt schon ein Bodenhindernis unter/vor Gauß, startet der Hecht direkt auf Hop-Höhe —
    // sonst würde die Hitbox erst in den Spike hineinsinken und dann aufsteigen.
    this.altitude = this.isOverGroundHazard() ? HECHT_HOP_ALTITUDE : HECHT_GLIDE_ALTITUDE
    const glideFeetY = this.groundTopY - this.altitude

    this.state = 'hecht'
    this.hechtPhase = 'glide'
    this.hechtTime = 0
    this.body.setAllowGravity(false)
    this.body.setVelocityY(0)
    this.setHitbox(HECHT_LENGTH, HECHT_HEIGHT)
    this.rect.y = glideFeetY - HECHT_HEIGHT / 2
    this.visualLagY = Math.min(0, oldFeetY - glideFeetY)

    this.emitSpeedLines(5)
    this.speedLineTimer = SPEED_LINE_INTERVAL
  }

  /** Stellt die Hitbox auf die Normalgröße zurück, Füße bleiben dabei exakt auf der Stelle. */
  private standUp(): void {
    this.setHitbox(PLAYER_WIDTH, PLAYER_HEIGHT)
    this.body.setAllowGravity(true)
    this.state = 'run'
  }

  /**
   * Ändert die Hitbox-Größe mit fester Unterkante — nie unter die Bodenoberfläche.
   * Der Body zieht sich seine Position im nächsten Physik-Schritt selbst vom rect; ein manuelles
   * body.updateFromGameObject() zwischen Physik-Schritt und postUpdate würde als Bewegung
   * gewertet und den Spieler wegschleudern.
   */
  private setHitbox(width: number, height: number): void {
    const feetY = Math.min(this.rect.y + this.hitboxHeight / 2, this.groundTopY)
    this.body.setSize(width, height)
    this.hitboxHeight = height
    this.rect.y = feetY - height / 2
  }

  reset(x: number): void {
    this.hechtPhase = 'glide'
    this.hechtTime = 0
    this.slideTime = 0
    this.lie = 0
    this.pitch = 0
    this.visualLagY = 0
    this.altitude = HECHT_GLIDE_ALTITUDE
    this.hitboxHeight = PLAYER_HEIGHT
    this.body.setSize(PLAYER_WIDTH, PLAYER_HEIGHT)
    this.rect.setPosition(x, this.groundTopY - PLAYER_HEIGHT / 2)
    this.body.setVelocity(0, 0)
    this.body.setAllowGravity(true)
    this.state = 'run'
    this.syncSprite()
  }

  /** Kurze helle Streifen hinter Gauß — machen das schnell vorbeirasende Tempo sichtbar. */
  private emitSpeedLines(count: number): void {
    const centerY = this.rect.y
    const tailX = this.rect.x - LIE_LENGTH / 2
    for (let i = 0; i < count; i++) {
      const width = Phaser.Math.Between(28, 56)
      const line = this.scene.add.rectangle(
        tailX - Phaser.Math.Between(0, 14),
        centerY + (i - (count - 1) / 2) * 7,
        width,
        2,
        0xffffff,
        0.55,
      )
      line.setOrigin(1, 0.5).setDepth(0.5)
      this.scene.tweens.add({
        targets: line,
        x: line.x - 160,
        alpha: 0,
        scaleX: 0.3,
        duration: 260,
        ease: 'Quad.easeOut',
        onComplete: () => line.destroy(),
      })
    }
  }

  /** True, wenn ein Bodenhindernis unter oder knapp vor der flachen Hitbox liegt. */
  private isOverGroundHazard(): boolean {
    const back = this.rect.x - HECHT_LENGTH / 2
    const front = this.rect.x + HECHT_LENGTH / 2 + HECHT_HOP_LOOKAHEAD
    return this.getGroundHazards().some((hazard) => hazard.right > back && hazard.left < front)
  }

  private updateHecht(dt: number): void {
    this.hechtTime += dt

    if (this.hechtPhase === 'glide') {
      // Niedrig gleiten (passt unter den lowbeam), nur über einem Bodenhindernis knapp darüber steigen.
      const overHazard = this.isOverGroundHazard()
      const target = overHazard ? HECHT_HOP_ALTITUDE : HECHT_GLIDE_ALTITUDE
      const maxStep = HECHT_HOP_SPEED * dt
      this.altitude += Phaser.Math.Clamp(target - this.altitude, -maxStep, maxStep)
      this.rect.y = this.groundTopY - this.altitude - HECHT_HEIGHT / 2

      this.speedLineTimer -= dt
      if (this.speedLineTimer <= 0) {
        this.emitSpeedLines(2)
        this.speedLineTimer = SPEED_LINE_INTERVAL
      }

      // Der Gleitflug endet erst, wenn Gauß nicht mehr über einem Hindernis schwebt
      // (mit Obergrenze, damit er nie ewig fliegt).
      const done = this.hechtTime >= HECHT_GLIDE_DURATION && (!overHazard || this.hechtTime >= HECHT_GLIDE_DURATION + HOP_GRACE_TIME)
      if (done) {
        this.hechtPhase = 'fall'
        this.body.setAllowGravity(true)
      }
    } else if (this.hechtPhase === 'fall') {
      if (this.isGrounded) {
        this.hechtPhase = 'slide'
        this.slideTime = 0
        this.body.setVelocityY(0)
      }
    } else {
      this.slideTime += dt
      if (this.slideTime >= HECHT_SLIDE_TIME) this.standUp()
    }
  }

  /** Lässt Liege-Blend, Neigung und optischen Versatz weich ihrem Ziel folgen. */
  private animatePose(dt: number): void {
    const hechting = this.state === 'hecht'
    const lieSpeed = hechting ? 1 / HECHT_ROTATE_DURATION : 1 / HECHT_STAND_DURATION
    this.lie = hechting ? Math.min(1, this.lie + lieSpeed * dt) : Math.max(0, this.lie - lieSpeed * dt)

    let pitchTarget = 0
    if (hechting && this.hechtPhase === 'glide') pitchTarget = GLIDE_PITCH
    else if (hechting && this.hechtPhase === 'fall') pitchTarget = FALL_PITCH
    this.pitch += (pitchTarget - this.pitch) * Math.min(1, dt * 14)

    this.visualLagY *= Math.max(0, 1 - dt / DIVE_VISUAL_TIME)
  }

  /**
   * Zieht die Deko-Grafik auf die Hitbox. Die Unterkante der (gedrehten) Grafik sitzt immer
   * auf den Füßen der Hitbox — so ragt Gauß in keiner Pose in den Boden.
   */
  private syncSprite(): void {
    const blend = this.lie * this.lie * (3 - 2 * this.lie)
    const width = Phaser.Math.Linear(this.uprightWidth, LIE_THICKNESS, blend)
    const height = Phaser.Math.Linear(VISUAL_HEIGHT, LIE_LENGTH, blend)
    const angle = (90 + this.pitch) * blend
    const rad = Phaser.Math.DegToRad(angle)
    // Halbe senkrechte Ausdehnung des gedrehten Rechtecks.
    const halfExtentY = (Math.abs(Math.cos(rad)) * height + Math.abs(Math.sin(rad)) * width) / 2
    const feetY = this.rect.y + this.hitboxHeight / 2
    const lift = VISUAL_LIFT * (1 - blend)

    this.sprite.setDisplaySize(width, height)
    this.sprite.setAngle(angle)
    this.sprite.x = this.rect.x
    this.sprite.y = feetY - lift - halfExtentY + this.visualLagY
  }

  update(deltaSeconds: number): void {
    const dt = Math.min(deltaSeconds, MAX_DT)

    if (this.state === 'hecht') {
      this.updateHecht(dt)
    } else if (this.state === 'jump' && this.isGrounded && this.body.velocity.y >= 0) {
      this.state = 'run'
    }

    // Sicherheitsnetz: die Unterkante der Hitbox liegt nie unter der Bodenoberfläche.
    const maxCenterY = this.groundTopY - this.hitboxHeight / 2
    if (this.rect.y > maxCenterY) {
      this.rect.y = maxCenterY
      if (this.body.velocity.y > 0) this.body.setVelocityY(0)
    }

    this.animatePose(dt)
    this.syncSprite()
  }
}
