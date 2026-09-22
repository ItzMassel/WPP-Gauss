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
export const HECHT_HEIGHT = 22
/** Feste Höhe über dem Boden, auf der Gauß während des Hechtens gleitet. */
export const HECHT_GLIDE_ALTITUDE = 14
/** Dauer des flachen Gleitens nach dem Hecht-Kommando, in Sekunden. */
export const HECHT_GLIDE_DURATION = 0.5
/** Mindestzeit zwischen Sprung- und Hecht-Kommando (Mensch muss zweimal drücken). */
export const JUMP_TO_HECHT_MIN = 0.1

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

/** Sicherheitsabstand, der beim Bemessen der Hindernis-"Deckenhöhen" einkalkuliert wird. */
const CLEARANCE_MARGIN = 16
const HECHT_CLEARANCE_MARGIN = 9

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

  // lowbeam
  const glideStart = -((HECHT_GLIDE_DURATION - cross) / 2)
  const hechtAt = glideStart
  const jumpAt = hechtAt - JUMP_TO_HECHT_MIN
  return {
    inputs: [
      {offset: jumpAt, action: 'jump'},
      {offset: hechtAt, action: 'hecht'},
    ],
    settleOffset: jumpAt + JUMP_AIRTIME,
  }
}

/** Frühester Zeitpunkt (relativ zu t0), an dem irgendetwas für dieses Hindernis passieren muss. */
export function earliestRequirement(timing: Timing): number {
  return timing.inputs.length > 0 ? timing.inputs[0].offset : 0
}
