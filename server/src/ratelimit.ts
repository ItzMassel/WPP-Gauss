import type {NextFunction, Request, Response} from 'express'

/** Small in-memory per-IP limiter (single process, resets on restart). */
export function rateLimit(max: number, windowMs: number) {
  const hits = new Map<string, {count: number; reset: number}>()
  setInterval(() => {
    const now = Date.now()
    for (const [key, h] of hits) if (h.reset <= now) hits.delete(key)
  }, windowMs).unref()

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now()
    const key = req.ip ?? 'unknown'
    const h = hits.get(key)
    if (!h || h.reset <= now) {
      hits.set(key, {count: 1, reset: now + windowMs})
      next()
      return
    }
    if (++h.count > max) {
      res.status(429).json({error: 'Zu viele Versuche. Bitte warte einen Moment.'})
      return
    }
    next()
  }
}
