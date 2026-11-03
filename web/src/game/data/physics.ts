// Zentrale Bewegungs-Konstanten. Player.ts, Obstacle.ts und der Level-Generator
// (levels.ts) rechnen alle mit denselben Werten, damit die generierte Karte zur
// tatsächlichen Spielphysik passt.

export const GRAVITY_Y = 1400
/** Sprunggeschwindigkeit nach oben, als positiver Betrag. */
export const JUMP_SPEED = 520
/** Weltgeschwindigkeit: Hindernisse/Portale scrollen mit dieser Geschwindigkeit nach links. */
export const SCROLL_SPEED = 260

export const PLAYER_WIDTH = 32
export const PLAYER_HEIGHT = 64

/** Vertikale Ausdehnung der Hitbox während des Hechtens (flach auf dem Bauch). */
export const HECHT_HEIGHT = 24
/** Horizontale Ausdehnung der Hitbox während des Hechtens (Körperlänge, Arme nach vorn). */
export const HECHT_LENGTH = 52
/** Feste Höhe über dem Boden, auf der Gauß während des Hechtens gleitet. */
export const HECHT_GLIDE_ALTITUDE = 8
/** Dauer des flachen Gleitens nach dem Hecht-Kommando, in Sekunden. */
export const HECHT_GLIDE_DURATION = 0.5
/** Mindestzeit zwischen Sprung- und Hecht-Kommando (Mensch muss zweimal drücken). */
export const JUMP_TO_HECHT_MIN = 0.1
/** Fallzeit vom Gleitflug bis zum Bauchlandung auf dem Boden, in Sekunden. */
export const HECHT_FALL_TIME = Math.sqrt((2 * HECHT_GLIDE_ALTITUDE) / GRAVITY_Y)
/** Zeit, die Gauß nach der Landung flach auf dem Bauch rutscht, bevor er aufsteht. */
export const HECHT_SLIDE_TIME = 0.1
/** Dauer des Aufstehens (Grafik dreht sich von flach zurück in die Senkrechte). */
export const HECHT_STAND_DURATION = 0.18

/**
 * Zusätzliche Welt-Geschwindigkeit während des Hecht-Gleitflugs: Hindernisse, Portale und Pflanzen
 * scrollen um diesen Betrag schneller nach links (Gauß selbst bleibt an seiner Laufposition).
 */
export const HECHT_SPEED_BOOST = SCROLL_SPEED
/** Zeit, in der der Hecht-Boost nach dem Gleitflug wieder auf Normaltempo abklingt. */
export const HECHT_BOOST_DECAY_TIME = 0.2
export const HECHT_BOOST_DECAY = HECHT_SPEED_BOOST / HECHT_BOOST_DECAY_TIME
/**
 * Strecke, die ein Hecht der Welt "vorspult" (Boost über Gleitflug + Abklingen), als Zeit bei
 * Normaltempo. Folgende Hindernisse kommen um diese Zeit früher an — der Level-Generator
 * rechnet sie auf die Erholungszeit nach einem Hecht auf.
 */
export const HECHT_SKIP_TIME = (HECHT_SPEED_BOOST * (HECHT_GLIDE_DURATION + HECHT_BOOST_DECAY_TIME / 2)) / SCROLL_SPEED

/** Höhe des Bodenhindernisses ("Spike"), in px. */
export const GROUND_OBSTACLE_HEIGHT = 36
/** Gleithöhe, wenn Gauß über ein Bodenhindernis hechtet — knapp über dessen Oberkante. */
export const HECHT_HOP_ALTITUDE = GROUND_OBSTACLE_HEIGHT + 6
/** Tempo, mit dem Gauß zwischen niedriger und erhöhter Gleithöhe wechselt, in px/s. */
export const HECHT_HOP_SPEED = 700
/** So weit vor die Hitbox schaut Gauß nach einem Bodenhindernis, um rechtzeitig aufzusteigen, in px. */
export const HECHT_HOP_LOOKAHEAD = 56

/** Mindestzeit, die einem Spieler zwischen zwei nötigen Eingaben eingeräumt wird. */
export const REACTION_TIME = 0.2

/** Gesamtdauer eines Sprungs von Absprung bis Landung (ohne Hecht), in Sekunden. */
export const JUMP_AIRTIME = (2 * JUMP_SPEED) / GRAVITY_Y

export const PORTAL_WIDTH = 50

/** Leben, Rückstoß und Wiederbeschleunigung nach einer Hindernis-Kollision. */
export const MAX_HP = 3
const BLOCK_SIZE = 32
/** Rückstoß nach einer Kollision, "drei Blöcke". */
export const KNOCKBACK_DISTANCE = 3 * BLOCK_SIZE
/** Zeit, bis die Weltgeschwindigkeit nach einem Rückstoß wieder ihr Maximum erreicht. */
export const SPEED_RAMP_TIME = 1.2
export const SPEED_ACCEL = SCROLL_SPEED / SPEED_RAMP_TIME

/** Dauer der schnellen Dreh-Animation zu Beginn des Hechtens (dreht sofort, statt über die ganze Flugzeit). */
export const HECHT_ROTATE_DURATION = 0.15

/** Sicherheitsabstand, der beim Bemessen der Hindernis-"Deckenhöhen" einkalkuliert wird. */
const CLEARANCE_MARGIN = 16
const HECHT_CLEARANCE_MARGIN = 11

/** Deckenhöhe des "overhead"-Balkens: passt bequem unter normal laufende Spieler, Sprung stößt an. */
export const OVERHEAD_CLEARANCE = PLAYER_HEIGHT + CLEARANCE_MARGIN
/** Deckenhöhe des "lowbeam"-Balkens: nur im Hecht-Gleitflug passierbar, niemals im Stehen/normalen Sprung. */
export const LOWBEAM_CLEARANCE = HECHT_GLIDE_ALTITUDE + HECHT_HEIGHT + HECHT_CLEARANCE_MARGIN

export type ObstacleKind = 'ground' | 'overhead' | 'lowbeam'

export const OBSTACLE_WIDTH: Record<ObstacleKind, number> = {
  ground: 28,
  overhead: 34,
  lowbeam: 34,
}

export interface RequiredInput {
  /** Zeitpunkt relativ zur Ankunft (t0) am Spieler, an dem die Eingabe erfolgen muss. */
  offset: number
  action: 'jump' | 'hecht'
}

export interface Timing {
  /** Nötige Eingaben, chronologisch (aufsteigend nach offset). */
  inputs: RequiredInput[]
  /** Zeitpunkt relativ zu t0, ab dem der Spieler wieder frei/gelandet ist. */
  settleOffset: number
}

/** Zeit, die die Hitboxen von Spieler und Hindernis horizontal überlappen. */
export function crossingTime(obstacleWidth: number): number {
  return (obstacleWidth + PLAYER_WIDTH) / SCROLL_SPEED
}

/**
 * Berechnet, wann welche Eingabe(n) relativ zur Ankunft eines Hindernisses nötig sind,
 * und wann der Spieler danach wieder frei ist ("settle").
 *
 * - ground: Sprung wird so gelegt, dass die Überquerung mittig in der Flugzeit liegt
 *   (maximaler Puffer vor und nach der Landung).
 * - overhead: keine Eingabe — der Spieler darf schlicht nicht springen, während er
 *   das Hindernis unterläuft.
 * - lowbeam: Sprung + Hecht so gelegt, dass der Hecht-Gleitflug (feste, niedrige Höhe)
 *   die komplette Überquerung abdeckt.
 */
export function timingFor(kind: ObstacleKind, width: number): Timing {
  const cross = crossingTime(width)

  if (kind === 'ground') {
    const lead = (JUMP_AIRTIME - cross) / 2
    return {
      inputs: [{offset: -lead, action: 'jump'}],
      settleOffset: JUMP_AIRTIME - lead,
    }
  }

  if (kind === 'overhead') {
    return {inputs: [], settleOffset: cross}
  }

  // lowbeam: Gleitflug mittig auf die Überquerung legen (gleicher Puffer davor und danach).
  // Die flache Hitbox (HECHT_LENGTH) überlappt den Balken (width + HECHT_LENGTH) / SCROLL_SPEED
  // lang — das ist kürzer als HECHT_GLIDE_DURATION, der Gleitflug deckt es also komplett ab.
  const hechtAt = -HECHT_GLIDE_DURATION / 2
  const jumpAt = hechtAt - JUMP_TO_HECHT_MIN
  return {
    inputs: [
      {offset: jumpAt, action: 'jump'},
      {offset: hechtAt, action: 'hecht'},
    ],
    // Der Hecht spult die Welt vor (HECHT_SKIP_TIME): das nächste Hindernis kommt entsprechend früher.
    settleOffset: hechtAt + HECHT_GLIDE_DURATION + HECHT_FALL_TIME + HECHT_SKIP_TIME,
  }
}

/** Frühester Zeitpunkt (relativ zu t0), an dem irgendetwas für dieses Hindernis passieren muss. */
export function earliestRequirement(timing: Timing): number {
  return timing.inputs.length > 0 ? timing.inputs[0].offset : 0
}
