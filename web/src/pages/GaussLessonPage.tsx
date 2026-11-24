import {useEffect, useState, type CSSProperties} from 'react'
import {useNavigate} from 'react-router-dom'
import {api} from '../auth/api'
import {useAuth} from '../auth/AuthContext'
import {client} from '../sanityClient'
import {ChoiceView, FillView, GuessView, InfoView, MatchView, OrderView, TextView} from '../lesson/exercises'
import {
  consolation,
  correctText,
  buildSteps,
  emptyAnswer,
  instruction,
  isCorrect,
  isReady,
  lessonTitle,
  pick,
  praise,
  type Answer,
  type SanityLectureDoc,
  type Step,
} from '../lesson/lessonData'
import '../lesson/lesson.css'

const LESSON_ID = 'gauss-summe'
const COOLDOWN_MS = 48 * 60 * 60 * 1000
const doneKey = `gauss-lesson-done:${LESSON_ID}`

/** Zeitpunkt, ab dem die Lektion wieder möglich ist (lokal gemerkt; der Server prüft zusätzlich). */
function localUnlockAt(): number {
  const done = Number(localStorage.getItem(doneKey))
  return done > 0 ? done + COOLDOWN_MS : 0
}

function formatUnlock(ts: number): string {
  return new Date(ts).toLocaleString('de-DE', {weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'}) + ' Uhr'
}

const MAX_HEARTS = 5
const XP_CLEAN = 10
const XP_RETRY = 5
const XP_PERFECT = 20

interface QueueItem {
  step: Step
  attempt: number
}

type Status = 'idle' | 'correct' | 'wrong'
type Phase = 'play' | 'done'

const freshQueue = (steps: Step[]): QueueItem[] => steps.map((step) => ({step, attempt: 0}))

// ─── Icons ────────────────────────────────────────────────────────────────────

function HeartIcon({size = 22, broken = false}: {size?: number; broken?: boolean}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      />
      {broken && (
        <path
          d="M13 3.5l-2.5 5 3 2.5-3 4 1.5 3"
          fill="none"
          stroke="var(--color-background)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}

function StarIcon({size = 20}: {size?: number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <polygon
        fill="currentColor"
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
      />
    </svg>
  )
}

function FlameIcon({size = 20}: {size?: number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2s5 4.5 5 10a5 5 0 0 1-10 0c0-1.8.7-3 1.6-4 .1 1.3.8 2.2 1.9 2.4C10.2 7.4 12 5 12 2z"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

function CrossIcon({size = 22}: {size?: number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

// ─── Konfetti ─────────────────────────────────────────────────────────────────

function Confetti() {
  const [pieces] = useState(() => {
    const colors = ['var(--color-accent)', 'var(--color-accentHover)', 'var(--color-text)', 'rgb(74,222,128)']
    return Array.from({length: 42}, (_, i) => ({
      left: Math.random() * 100,
      drift: Math.round((Math.random() - 0.5) * 160),
      delay: Math.random() * 0.9,
      duration: 2.4 + Math.random() * 1.8,
      color: colors[i % colors.length],
    }))
  })

  return (
    <div className="ls-confetti" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              '--drift': `${p.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}

// ─── Seite ────────────────────────────────────────────────────────────────────

const LESSON_QUERY = `*[_type == "lecture"] | order(order asc, _createdAt asc) {
  _id, title, description,
  questions[]-> {
    _id, question, type, explanation,
    options[] { _key, label, correct },
    multipleCorrect, correctAnswer,
    correctNumber, rangeMin, rangeMax,
    sortItems,
    fillTemplate, fillAnswers, fillDistractors,
    matchPairs[] { left, right },
    infoEmblem, infoText, infoFacts[] { label, value }
  }
}`

/** Lädt alle Vorlesungen aus Sanity und startet daraus die Lektion. */
export default function GaussLessonPage() {
  const navigate = useNavigate()
  const [steps, setSteps] = useState<Step[] | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const {user, loading: authLoading} = useAuth()
  const [unlockAt, setUnlockAt] = useState<number | null>(null) // null = noch unbekannt

  // Die Lektion ist nach dem Abschluss 2 Tage gesperrt (lokal + serverseitig pro Konto).
  useEffect(() => {
    if (authLoading) return
    let cancelled = false
    const local = localUnlockAt()
    if (!user) {
      setUnlockAt(local)
      return
    }
    api<{availableAt: string | null}>(`/cooldown?source=lesson&sourceRef=${LESSON_ID}`)
      .then((r) => !cancelled && setUnlockAt(Math.max(local, r.availableAt ? Date.parse(r.availableAt) : 0)))
      .catch(() => !cancelled && setUnlockAt(local))
    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  useEffect(() => {
    let cancelled = false
    client
      .fetch<SanityLectureDoc[]>(LESSON_QUERY)
      .then((lectures) => !cancelled && setSteps(buildSteps(lectures ?? [])))
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [attempt])

  if (unlockAt !== null && unlockAt > Date.now()) {
    return (
      <div className="ls-root">
        <main className="ls-main">
          <div className="ls-end">
            <h2>Lektion bereits gemacht</h2>
            <p className="ls-end-sub">
              Diese Lektion kannst du nur alle zwei Tage machen. Wieder verfügbar ab {formatUnlock(unlockAt)}.
            </p>
            <div className="ls-actions">
              <button className="ls-btn" onClick={() => navigate('/')}>
                Zur Startseite
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (steps && unlockAt !== null && steps.some((s) => s.kind !== 'info')) return <Lesson steps={steps} />

  return (
    <div className="ls-root">
      <main className="ls-main">
        <div className="ls-end">
          {error ? (
            <>
              <h2>Lektion konnte nicht geladen werden</h2>
              <p className="ls-end-sub">Prüfe deine Verbindung und versuche es noch einmal.</p>
              <div className="ls-actions">
                <button className="ls-btn" onClick={() => {
                    setError(false)
                    setAttempt((n) => n + 1)
                  }}>
                  Erneut versuchen
                </button>
                <button className="ls-btn ls-btn-ghost" onClick={() => navigate('/')}>
                  Zur Startseite
                </button>
              </div>
            </>
          ) : steps ? (
            <>
              <h2>Noch keine Aufgaben</h2>
              <p className="ls-end-sub">In Sanity sind noch keine Fragen in Vorlesungen eingetragen.</p>
              <div className="ls-actions">
                <button className="ls-btn ls-btn-ghost" onClick={() => navigate('/')}>
                  Zur Startseite
                </button>
              </div>
            </>
          ) : (
            <p className="ls-end-sub">Lektion wird geladen …</p>
          )}
        </div>
      </main>
    </div>
  )
}

function Lesson({steps}: {steps: Step[]}) {
  const navigate = useNavigate()
  const {awardPoints} = useAuth()
  const total = steps.length
  const exerciseCount = steps.filter((s) => s.kind !== 'info').length

  const [queue, setQueue] = useState<QueueItem[]>(() => freshQueue(steps))
  const [pos, setPos] = useState(0)
  const [completed, setCompleted] = useState(0)
  const [hearts, setHearts] = useState(MAX_HEARTS)
  const [xp, setXp] = useState(0)
  const [streak, setStreak] = useState(0)
  const [firstTry, setFirstTry] = useState(0)
  const [answer, setAnswer] = useState<Answer>(() => emptyAnswer(steps[0]))
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [phase, setPhase] = useState<Phase>('play')
  const [leaving, setLeaving] = useState(false)
  const [heartHits, setHeartHits] = useState(0)
  const [xpGains, setXpGains] = useState(0)

  const item = queue[pos]
  const step = item?.step
  const isInfo = step?.kind === 'info'
  // Nach einer falschen Antwort darf die Lösung noch gelesen werden, danach ist Schluss.
  const failed = hearts <= 0 && status !== 'wrong'
  const progress = phase === 'done' ? 100 : (completed / total) * 100
  const ready = !!step && isReady(step, answer)

  function loseHeart() {
    setHearts((h) => Math.max(0, h - 1))
    setHeartHits((n) => n + 1)
    setStreak(0)
  }

  function handleCheck() {
    if (!step || isInfo || status !== 'idle' || !ready) return

    if (isCorrect(step, answer)) {
      const mistakes = answer.kind === 'match' ? answer.mistakes : 0
      const clean = item.attempt === 0 && mistakes === 0
      const nextStreak = streak + 1
      setXp((x) => x + (clean ? XP_CLEAN : XP_RETRY))
      setXpGains((n) => n + 1)
      setStreak(nextStreak)
      if (clean) setFirstTry((n) => n + 1)
      setCompleted((c) => c + 1)
      setMessage(
        nextStreak >= 3 && nextStreak % 3 === 0 ? `${nextStreak} richtige Antworten in Folge!` : pick(praise),
      )
      setStatus('correct')
    } else {
      loseHeart()
      setQueue((q) => [...q, {step, attempt: item.attempt + 1}])
      setMessage(pick(consolation))
      setStatus('wrong')
    }
  }

  function handleContinue() {
    if (!step) return
    if (isInfo) setCompleted((c) => c + 1)
    if (hearts <= 0) {
      setStatus('idle') // Lösung wurde gelesen – jetzt greift der Game-Over-Screen (failed)
      return
    }

    const next = pos + 1
    if (next >= queue.length) {
      setPhase('done')
      return
    }
    setPos(next)
    setAnswer(emptyAnswer(queue[next].step))
    setStatus('idle')
    window.scrollTo({top: 0})
  }

  function restart() {
    const q = freshQueue(steps)
    setQueue(q)
    setPos(0)
    setCompleted(0)
    setHearts(MAX_HEARTS)
    setXp(0)
    setStreak(0)
    setFirstTry(0)
    setAnswer(emptyAnswer(q[0].step))
    setStatus('idle')
    setMessage('')
    setPhase('play')
    setLeaving(false)
    window.scrollTo({top: 0})
  }

  // Tastatur: Enter prüft/weiter, 1–4 wählen eine Antwort
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (leaving || phase !== 'play' || failed || !step) return
      if (e.key === 'Enter') {
        // Im Freitextfeld erzeugt Enter einen Zeilenumbruch, Strg/Cmd+Enter prüft.
        if (e.target instanceof HTMLTextAreaElement && !e.ctrlKey && !e.metaKey) return
        e.preventDefault() // verhindert, dass ein fokussierter Button zusätzlich auslöst
        if (status !== 'idle' || isInfo) handleContinue()
        else handleCheck()
      } else if (status === 'idle' && step.kind === 'choice' && /^[1-9]$/.test(e.key)) {
        const idx = Number(e.key) - 1
        if (idx < step.options.length) {
          const picked = !step.multi ? [idx] : answer.kind === 'choice' && answer.picked.includes(idx)
            ? answer.picked.filter((p) => p !== idx)
            : [...(answer.kind === 'choice' ? answer.picked : []), idx]
          setAnswer({kind: 'choice', picked})
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const finalXp = xp + (hearts === MAX_HEARTS ? XP_PERFECT : 0)

  // Abschluss merken und Punkte auszahlen (Server zahlt höchstens alle 48 h).
  useEffect(() => {
    if (phase !== 'done') return
    localStorage.setItem(doneKey, String(Date.now()))
    if (finalXp > 0) void awardPoints('lesson', LESSON_ID, finalXp)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps
  const accuracy = exerciseCount > 0 ? Math.round((firstTry / exerciseCount) * 100) : 100
  const showBar = phase === 'play' && !failed && !!step

  return (
    <div className="ls-root">
      {/* ── Kopfzeile: Fortschritt · XP · Herzen ── */}
      <header className="ls-top">
        <div className="ls-top-inner">
          <button className="ls-close" onClick={() => setLeaving(true)} aria-label="Lektion beenden">
            <CrossIcon size={24} />
          </button>

          <div
            className="ls-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            aria-label="Lektionsfortschritt"
          >
            <div className="ls-progress-fill" style={{width: `${progress}%`}} />
          </div>

          <div className="ls-stats">
            {streak >= 2 && (
              <span className="ls-stat ls-stat-streak" title="Richtig in Folge">
                <FlameIcon />
                {streak}
              </span>
            )}
            <span className="ls-stat ls-stat-xp" title="XP = Gauß-Punkte">
              <span className="ls-pop" key={xpGains}>
                <StarIcon />
              </span>
              {phase === 'done' ? finalXp : xp}
            </span>
            <span className="ls-stat ls-stat-hearts" title="Herzen">
              <span className="ls-hurt" key={heartHits}>
                <HeartIcon />
              </span>
              {hearts}
            </span>
          </div>
        </div>
      </header>

      {/* ── Inhalt ── */}
      <main className="ls-main">
        {phase === 'play' && !failed && step && (
          <div className="ls-step" key={pos}>
            <div className="ls-kicker">
              {isInfo ? 'Wissen' : instruction[step.kind]}
              <span className="ls-kicker-muted">{step.section}</span>
            </div>

            {step.kind === 'info' && <InfoView step={step} />}

            {step.kind !== 'info' && <h1 className="ls-prompt">{step.prompt}</h1>}

            {step.kind === 'choice' && answer.kind === 'choice' && (
              <ChoiceView step={step} answer={answer} locked={status !== 'idle'} onChange={setAnswer} />
            )}
            {step.kind === 'guess' && answer.kind === 'guess' && (
              <GuessView step={step} answer={answer} locked={status !== 'idle'} onChange={setAnswer} />
            )}
            {step.kind === 'text' && answer.kind === 'text' && (
              <TextView step={step} answer={answer} locked={status !== 'idle'} onChange={setAnswer} />
            )}
            {step.kind === 'fill' && answer.kind === 'fill' && (
              <FillView step={step} answer={answer} locked={status !== 'idle'} onChange={setAnswer} />
            )}
            {step.kind === 'order' && answer.kind === 'order' && (
              <OrderView step={step} answer={answer} locked={status !== 'idle'} onChange={setAnswer} />
            )}
            {step.kind === 'match' && answer.kind === 'match' && (
              <MatchView
                step={step}
                answer={answer}
                locked={status !== 'idle'}
                onChange={setAnswer}
                onMistake={loseHeart}
              />
            )}
          </div>
        )}

        {phase === 'play' && failed && (
          <div className="ls-end">
            <div className="ls-end-ghost" aria-hidden>
              ♥
            </div>
            <div className="ls-end-icon" style={{color: 'rgb(248,113,113)'}}>
              <HeartIcon size={64} broken />
            </div>
            <h2>Keine Herzen mehr</h2>
            <p className="ls-end-sub">Selbst ein Princeps mathematicorum musste üben. Versuche es noch einmal!</p>
            <div className="ls-results" style={{gridTemplateColumns: 'repeat(2, 1fr)'}}>
              <div className="ls-result">
                <div className="ls-result-value">{xp}</div>
                <div className="ls-result-label">XP gesammelt</div>
              </div>
              <div className="ls-result">
                <div className="ls-result-value">
                  {completed}/{total}
                </div>
                <div className="ls-result-label">Schritte geschafft</div>
              </div>
            </div>
            <div className="ls-actions">
              <button className="ls-btn" onClick={restart}>
                Nochmal versuchen
              </button>
              <button className="ls-btn ls-btn-ghost" onClick={() => navigate('/')}>
                Zur Startseite
              </button>
            </div>
          </div>
        )}

        {phase === 'done' && (
          <>
            <Confetti />
            <div className="ls-end">
              <div className="ls-end-ghost" aria-hidden>
                ★
              </div>
              <div className="ls-kicker" style={{justifyContent: 'center'}}>
                {lessonTitle}
              </div>
              <div className="ls-end-icon" style={{color: 'var(--color-accent)'}}>
                <StarIcon size={64} />
              </div>
              <h2>{accuracy >= 90 ? 'Exzellent' : accuracy >= 70 ? 'Ausgezeichnet' : accuracy >= 50 ? 'Gut gemacht' : 'Geschafft'}</h2>
              <p className="ls-end-sub">
                {accuracy >= 90
                  ? 'Ein würdiger Schüler des Princeps Mathematicorum'
                  : accuracy >= 70
                    ? 'Gauß wäre stolz auf dich'
                    : accuracy >= 50
                      ? 'Weiter so – die Mathematik belohnt Ausdauer'
                      : 'Die größten Mathematiker scheiterten viele Male'}
              </p>
              <div className="ls-results">
                <div className="ls-result">
                  <div className="ls-result-value">+{finalXp}</div>
                  <div className="ls-result-label">Gauß-Punkte</div>
                </div>
                <div className="ls-result">
                  <div className="ls-result-value">{accuracy}%</div>
                  <div className="ls-result-label">Genauigkeit</div>
                </div>
                <div className="ls-result">
                  <div className="ls-result-value">
                    {hearts}/{MAX_HEARTS}
                  </div>
                  <div className="ls-result-label">Herzen</div>
                </div>
              </div>
              {hearts === MAX_HEARTS && <p className="ls-bonus">Perfekte Lektion: +{XP_PERFECT} Bonus-Punkte</p>}
              <div className="ls-actions">
                <button className="ls-btn" onClick={() => navigate('/quiz')}>
                  Zu den Quizzen
                </button>
                <button className="ls-btn ls-btn-ghost" onClick={() => navigate('/')}>
                  Zur Startseite
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── Untere Leiste: Prüfen / Feedback / Weiter ── */}
      {showBar && (
        <div
          className={`ls-bar ${status === 'correct' ? 'ls-bar--ok' : status === 'wrong' ? 'ls-bar--bad' : ''}`}
          role="region"
          aria-live="polite"
        >
          <div className="ls-bar-inner">
            {status !== 'idle' && step && step.kind !== 'info' && (
              <div className="ls-bar-msg" key={`${pos}-${status}`}>
                <div className="ls-bar-icon">{status === 'correct' ? <CheckIcon /> : <CrossIcon />}</div>
                <div>
                  <div className="ls-bar-title">{message}</div>
                  <div className="ls-bar-text">
                    {status === 'wrong' && correctText(step) && (
                      <>
                        Richtig: <strong>{correctText(step)}</strong>.{' '}
                      </>
                    )}
                    {step.explanation}
                  </div>
                </div>
              </div>
            )}

            {isInfo ? (
              <button className="ls-btn" onClick={handleContinue}>
                Weiter
              </button>
            ) : status === 'idle' ? (
              <button className="ls-btn" disabled={!ready} onClick={handleCheck}>
                Prüfen
              </button>
            ) : (
              <button className={`ls-btn ${status === 'correct' ? 'is-ok' : 'is-bad'}`} onClick={handleContinue}>
                Weiter
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Dialog: Lektion verlassen? ── */}
      {leaving && (
        <div className="ls-modal" role="dialog" aria-modal="true" aria-labelledby="ls-leave-title" onClick={() => setLeaving(false)}>
          <div className="ls-modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 id="ls-leave-title">Lektion beenden?</h3>
            <p>Dein Fortschritt und die gesammelten Punkte dieser Lektion gehen verloren.</p>
            <div className="ls-actions">
              <button className="ls-btn" onClick={() => setLeaving(false)}>
                Weiterlernen
              </button>
              <button className="ls-btn ls-btn-ghost" onClick={() => navigate('/')}>
                Beenden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
