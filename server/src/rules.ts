/**
 * Server-side limits for point awards. The client reports how many points it earned,
 * so these caps bound what a tampered client could claim. Tune per source.
 */
export interface SourceRule {
  /** Maximum points for a single award. */
  maxPerAward: number
  /** Paid out once per user and sourceRef (enforced by a unique index in the DB). */
  once: boolean
  /** If set, the same user + sourceRef can only be paid out again after this many hours. */
  cooldownHours?: number
}

export const SOURCES: Record<string, SourceRule> = {
  quiz: {maxPerAward: 300, once: true}, // Sanity lecture id
  lesson: {maxPerAward: 300, once: false, cooldownHours: 48}, // lesson id, repeatable every 2 days
  game: {maxPerAward: 20, once: false}, // runner portal question
}

/** Total points a user can earn from repeatable sources (without cooldown) per rolling 24 hours. */
export const DAILY_REPEATABLE_CAP = 500
