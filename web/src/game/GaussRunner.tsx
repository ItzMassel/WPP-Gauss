import {useEffect, useRef, useState} from 'react'
import Phaser from 'phaser'
import {
  GameScene,
  GAME_WIDTH,
  GAME_HEIGHT,
  EVT_QUESTION,
  EVT_ANSWER,
  EVT_LEVEL,
  EVT_HP,
  type LevelBanner,
} from './scenes/GameScene'
import {LEVELS} from './data/levels'
import {MAX_HP} from './data/physics'
import type {MathQuestion} from './data/questions'

export default function GaussRunner() {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const [question, setQuestion] = useState<MathQuestion | null>(null)
  const [input, setInput] = useState('')
  const [wrong, setWrong] = useState(false)
  const [level, setLevel] = useState<LevelBanner | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [hp, setHp] = useState(MAX_HP)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      parent: containerRef.current,
      backgroundColor: '#0d1117',
      pixelArt: true,
      physics: {
        default: 'arcade',
        arcade: {gravity: {x: 0, y: 0}, debug: false},
      },
      scene: [GameScene],
    })
    gameRef.current = game

    game.events.on(EVT_QUESTION, (q: MathQuestion) => {
      setQuestion(q)
      setInput('')
      setWrong(false)
    })

    let bannerTimeout: ReturnType<typeof setTimeout>
    game.events.on(EVT_LEVEL, (banner: LevelBanner) => {
      setLevel(banner)
      setShowBanner(true)
      clearTimeout(bannerTimeout)
      bannerTimeout = setTimeout(() => setShowBanner(false), 2400)
    })

    game.events.on(EVT_HP, (value: number) => setHp(value))

    return () => {
      clearTimeout(bannerTimeout)
      game.destroy(true)
      gameRef.current = null
    }
  }, [])

  function submitAnswer(): void {
    if (!question) return
    const correct = Number(input) === question.answer
    if (correct) {
      gameRef.current?.events.emit(EVT_ANSWER, true)
      setQuestion(null)
    } else {
      setWrong(true)
    }
  }

  return (
    <div style={{position: 'relative', width: GAME_WIDTH, margin: '0 auto'}}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
          fontSize: '0.7rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--color-textMuted)',
        }}
      >
        <span>Leertaste / Tippen zum Springen · nochmal für Hecht</span>
        <span style={{display: 'flex', gap: '0.3rem'}}>
          {Array.from({length: MAX_HP}).map((_, i) => (
            <span key={i} style={{color: i < hp ? '#c0392b' : 'var(--color-border)', fontSize: '0.9rem'}}>
              ♥
            </span>
          ))}
        </span>
        {level && (
          <span style={{color: 'var(--color-accent)'}}>
            Level {level.index + 1}/{LEVELS.length} · {level.difficulty}
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        style={{
          width: GAME_WIDTH,
          height: GAME_HEIGHT,
          border: '1px solid var(--color-border)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      />

      {showBanner && level && (
        <div
          style={{
            position: 'absolute',
            top: '4rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderLeft: '3px solid var(--color-accent)',
            borderRadius: '2px',
            padding: '0.9rem 1.5rem',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{fontSize: '0.6rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-accent)'}}>
            {level.restarted ? 'Checkpoint · Neustart' : `Checkpoint · Level ${level.index + 1}`}
          </div>
          <div style={{fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)'}}>
            {level.name}
          </div>
        </div>
      )}

      {question && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            top: '2.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(13,17,23,0.82)',
          }}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              border: `1px solid ${wrong ? '#c0392b' : 'var(--color-border)'}`,
              borderTop: '2px solid var(--color-accent)',
              borderRadius: '2px',
              padding: '2rem 2.5rem',
              textAlign: 'center',
              minWidth: '280px',
            }}
          >
            <div
              style={{
                fontSize: '0.62rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--color-accent)',
                marginBottom: '0.9rem',
              }}
            >
              Portal — Löse die Aufgabe
            </div>
            <div
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '1.6rem',
                fontWeight: 700,
                marginBottom: '1.25rem',
                color: 'var(--color-text)',
              }}
            >
              {question.text}
            </div>
            <input
              autoFocus
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                marginBottom: '1rem',
                background: 'var(--color-background)',
                border: '1px solid var(--color-border)',
                borderRadius: '2px',
                color: 'var(--color-text)',
                fontSize: '1.1rem',
                textAlign: 'center',
              }}
            />
            {wrong && (
              <div style={{color: '#e07a6b', fontSize: '0.85rem', marginBottom: '0.75rem'}}>
                Leider falsch — versuch's noch einmal.
              </div>
            )}
            <button className="btn-primary" onClick={submitAnswer} style={{width: '100%'}}>
              Antworten
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
