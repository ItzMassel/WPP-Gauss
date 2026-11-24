import Phaser from 'phaser'
import {
  GRAVITY_Y,
  HECHT_GLIDE_ALTITUDE,
  HECHT_COOLDOWN,
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
import type {Terrain} from './Terrain'

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
/**
 * Kleine Stufen werden verziehen: ragt eine Blockoberkante beim Landen höchstens so weit (in px)
 * über die Füße, setzt sich Gauß obendrauf, statt gegen die Wand zu prallen.
 */
const STEP_FORGIVENESS = 8

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
  private readonly terrain: Terrain
  private readonly onTerrainHit: () => void

  /** True, wenn Gauß auf einem Geländeblock steht (der Basisboden läuft über den Arcade-Collider). */
  private onBlock = false
  /** Unterkante/Oberkante der Hitbox am Ende des letzten Frames — zeigt, ob ein Block von oben, unten oder seitlich kam. */
  private prevFeetY = 0
  private prevHeadY = 0
  /** Oberfläche, auf der der aktuelle Hecht gestartet ist; der Gleitflug hält die Höhe darüber. */
  private glideFloorY: number

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
  /** Restliche Ladezeit der Ausdauer in Sekunden; erst bei 0 ist der Hecht wieder möglich. */
  private cooldown = 0

  /**
   * `getGroundHazards` liefert die Bodenhindernisse (Spikes), über die Gauß hechten darf.
   * `onTerrainHit` wird gerufen, wenn Gauß seitlich gegen einen Geländeblock läuft.
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    groundTopY: number,
    getGroundHazards: () => HazardSpan[],
    terrain: Terrain,
    onTerrainHit: () => void,
  ) {
    this.scene = scene
    this.groundTopY = groundTopY
    this.getGroundHazards = getGroundHazards
    this.terrain = terrain
    this.onTerrainHit = onTerrainHit
    this.glideFloorY = groundTopY

    this.rect = scene.add.rectangle(x, this.standingY(x) - PLAYER_HEIGHT / 2, PLAYER_WIDTH, PLAYER_HEIGHT, 0x000000, 0)
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
    this.rememberExtent()

    // Erst nach dem Physik-Schritt (Arcade schreibt die Bewegung in POST_UPDATE auf rect), sonst
    // würde das Setzen von rect.y von der Body-Bewegung dieses Frames überlagert.
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.collideTerrain, this)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.collideTerrain, this))
  }

  /** Y der Füße, wenn Gauß bei Bildschirm-x `x` auf dem Boden/Hügel (nicht auf schwebenden Plattformen) steht. */
  private standingY(x: number): number {
    return this.terrain.groundY(x - PLAYER_WIDTH / 2, x + PLAYER_WIDTH / 2)
  }

  /** Merkt sich Ober-/Unterkante der Hitbox als Referenz für die Kollision im nächsten Frame. */
  private rememberExtent(): void {
    this.prevFeetY = this.rect.y + this.hitboxHeight / 2
    this.prevHeadY = this.rect.y - this.hitboxHeight / 2
  }

  /**
   * Löst die Kollision mit Geländeblöcken. Gauß steht in x still, die Welt scrollt — von oben
   * kommende Blöcke tragen ihn, von unten stoßen sie den Kopf an, alles andere ist eine Wand.
   */
  private readonly collideTerrain = (): void => {
    if (this.scene.physics.world.isPaused) return

    const half = this.body.width / 2
    const left = this.rect.x - half
    const right = this.rect.x + half
    const height = this.hitboxHeight
    const feet = this.rect.y + height / 2
    const head = this.rect.y - height / 2
    this.onBlock = false

    if (this.body.velocity.y >= 0) {
      // Höchste Fläche, die schon beim letzten Frame auf Fußhöhe (oder knapp darüber) lag.
      const top = this.terrain.surfaceY(left, right, this.prevFeetY - STEP_FORGIVENESS)
      if (top < this.groundTopY && feet >= top - 0.5) {
        this.rect.y = top - height / 2
        this.body.setVelocityY(0)
        this.onBlock = true
      }
    } else {
      const bottom = this.terrain.ceilingY(left, right, this.prevHeadY + STEP_FORGIVENESS)
      if (head < bottom) {
        this.rect.y = bottom + height / 2
        this.body.setVelocityY(0)
      }
    }

    const top = this.rect.y - height / 2
    const bottom = this.rect.y + height / 2
    if (this.terrain.overlaps(left, right, top, bottom)) this.onTerrainHit()

    this.rememberExtent()
  }

  /** Ausdauer von 0 (leer) bis 1 (voll, Hecht bereit). */
  get stamina(): number {
    return 1 - this.cooldown / HECHT_COOLDOWN
  }

  /** True, solange Gauß flach durch die Luft rast — die Welt scrollt dann schneller. */
  get isGliding(): boolean {
    return this.state === 'hecht' && this.hechtPhase === 'glide'
  }

  get isGrounded(): boolean {
    return this.body.blocked.down || this.body.touching.down || this.onBlock
  }

  /**
   * Erster Druck am Boden = Sprung. Jeder Druck in der Luft (egal ob steigend oder fallend)
   * löst den Hecht aus — auch direkt im selben Frame nach dem Absprung —, sofern die Ausdauer voll ist.
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
      if (this.cooldown <= 0) this.hecht()
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
    // Der Gleitflug hält seine Höhe über der Fläche, auf der er gestartet ist — er folgt dem Gelände nicht.
    const half = this.body.width / 2
    this.glideFloorY = this.terrain.surfaceY(this.rect.x - half, this.rect.x + half, oldFeetY - STEP_FORGIVENESS)
    const glideFeetY = this.glideFloorY - this.altitude

    this.state = 'hecht'
    this.hechtPhase = 'glide'
    this.hechtTime = 0
    this.cooldown = HECHT_COOLDOWN
    this.body.setAllowGravity(false)
    this.body.setVelocityY(0)
    this.setHitbox(HECHT_LENGTH, HECHT_HEIGHT)
    this.rect.y = glideFeetY - HECHT_HEIGHT / 2
    this.visualLagY = Math.min(0, oldFeetY - glideFeetY)
    this.rememberExtent()

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
    this.rememberExtent()
  }

  reset(x: number): void {
    this.hechtPhase = 'glide'
    this.hechtTime = 0
    this.slideTime = 0
    this.lie = 0
    this.pitch = 0
    this.visualLagY = 0
    this.altitude = HECHT_GLIDE_ALTITUDE
    this.cooldown = 0
    this.hitboxHeight = PLAYER_HEIGHT
    this.body.setSize(PLAYER_WIDTH, PLAYER_HEIGHT)
    this.rect.setPosition(x, this.standingY(x) - PLAYER_HEIGHT / 2)
    this.body.setVelocity(0, 0)
    this.body.setAllowGravity(true)
    this.state = 'run'
    this.onBlock = false
    this.syncSprite()
    this.rememberExtent()
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
      this.rect.y = this.glideFloorY - this.altitude - HECHT_HEIGHT / 2

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
    this.cooldown = Math.max(0, this.cooldown - dt)

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
