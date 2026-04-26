import { useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { disconnectSocket } from '../lib/socket'
import type { GameOverPayload } from '../types'

interface Particle { id: number; x: number; emoji: string; delay: number; size: number }

function Confetti() {
  const [particles, setParticles] = useState<Particle[]>([])
  const counter = useRef(0)

  useEffect(() => {
    const emojis = ['⭐', '🌟', '✨', '💫', '🏆', '🎉', '💰', '🔥']
    setParticles(Array.from({ length: 22 }, () => ({
      id: counter.current++,
      x: Math.random() * 100,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      delay: Math.random() * 1.8,
      size: 18 + Math.floor(Math.random() * 14),
    })))
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            bottom: '-5%',
            fontSize: `${p.size}px`,
            animation: `star-float 3s ease-out ${p.delay}s both`,
          }}
        >
          {p.emoji}
        </div>
      ))}
    </div>
  )
}

function truncate(addr: string) {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export default function ResultScreen() {
  const location = useLocation()
  const navigate = useNavigate()
  const { gameOverData, resetGame } = useGameStore()

  const stateData = location.state as {
    gameOverData?: GameOverPayload
    gameId?: string
    opponentDisconnected?: boolean
  } | null

  const data: GameOverPayload | null = stateData?.gameOverData ?? gameOverData
  const opponentDisconnected = stateData?.opponentDisconnected ?? false

  useEffect(() => {
    disconnectSocket()
    if (!data && !opponentDisconnected) navigate('/home')
  }, [data, opponentDisconnected, navigate])

  const handlePlayAgain = () => { resetGame(); navigate('/lobby') }
  const handleHome = () => { resetGame(); navigate('/home') }

  const handleWorldChat = () => {
    if (data?.opponent_wallet_address) {
      window.location.href = `worldapp://chat?address=${data.opponent_wallet_address}`
    }
  }

  if (!data && !opponentDisconnected) return null

  const isWin = opponentDisconnected || data?.winner === 'you'
  const isTie = !opponentDisconnected && data?.winner === 'tie'

  const title = isWin ? 'You Won! 🏆' : isTie ? "It's a Tie!" : 'You Lost'
  const titleColor = isWin ? 'text-success' : isTie ? 'text-gold' : 'text-error'

  const payoutLabel = opponentDisconnected
    ? 'Opponent left — you win!'
    : isTie
      ? 'Stake refunded'
      : data?.payout_amount
        ? `+${data.payout_amount.toFixed(2)} WLD`
        : null

  const payoutStyle = isWin && !opponentDisconnected
    ? 'bg-gold/10 border-gold/30 text-gold gold-glow'
    : 'bg-surface border-border text-textMuted'

  const myNullifier = sessionStorage.getItem('nullifier_hash')

  return (
    <div className="min-h-screen bg-bg flex flex-col relative overflow-hidden page-enter">
      {isWin && <Confetti />}

      <div className="max-w-[430px] w-full mx-auto flex flex-col flex-1 px-4 relative z-20">
        {/* Result header */}
        <div className="flex flex-col items-center safe-top pb-5 gap-3">
          <h1 className={`text-4xl font-black ${titleColor} slide-up`}>{title}</h1>

          {payoutLabel && (
            <div className={`px-5 py-2 rounded-full border font-bold text-base badge-pop ${payoutStyle}`}>
              {payoutLabel}
            </div>
          )}
        </div>

        {/* Score card */}
        {data && (
          <div className="bg-surface border border-border rounded-2xl px-6 py-5 mb-4 flex items-center justify-around slide-up" style={{ animationDelay: '0.08s' }}>
            <div className="flex flex-col items-center gap-1">
              <span className="text-textFaint text-xs">You</span>
              <span className="text-4xl font-black text-textPrimary">{data.your_score}</span>
              <span className={`text-xs font-bold badge-pop ${data.your_elo_change >= 0 ? 'text-success' : 'text-error'}`} style={{ animationDelay: '0.3s' }}>
                {data.your_elo_change >= 0 ? '+' : ''}{data.your_elo_change} ELO
              </span>
            </div>
            <div className="text-textFaint text-xl font-bold">—</div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-textFaint text-xs">Opponent</span>
              <span className="text-4xl font-black text-textMuted">{data.opponent_score}</span>
              <span className={`text-xs font-bold badge-pop ${data.opponent_elo_change >= 0 ? 'text-success' : 'text-error'}`} style={{ animationDelay: '0.35s' }}>
                {data.opponent_elo_change >= 0 ? '+' : ''}{data.opponent_elo_change} ELO
              </span>
            </div>
          </div>
        )}

        {/* Round breakdown */}
        {data?.rounds && data.rounds.length > 0 && (
          <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-4 slide-up" style={{ animationDelay: '0.15s' }}>
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-textMuted text-sm font-bold">Round Breakdown</h3>
            </div>
            {data.rounds.map((round, i) => {
              const myWin = round.winner_nullifier_hash === myNullifier
              const roundTie = round.winner_nullifier_hash === null
              return (
                <div
                  key={round.round_number}
                  className="flex items-center px-4 py-3 border-b border-border last:border-b-0 gap-3 fade-in"
                  style={{ animationDelay: `${0.18 + i * 0.05}s` }}
                >
                  <span className="text-textFaint text-xs w-5 shrink-0">R{round.round_number}</span>
                  <div className="flex-1 flex items-center gap-1 min-w-0">
                    <span className="text-textMuted text-xs truncate">{round.question}</span>
                    <span className="text-textFaint text-xs shrink-0">= <span className="text-success font-bold">{round.correct_answer}</span></span>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                    myWin ? 'bg-success/15 text-success' : roundTie ? 'bg-gold/15 text-gold' : 'bg-error/15 text-error'
                  }`}>
                    {myWin ? 'W' : roundTie ? 'T' : 'L'}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* World Chat */}
        {data?.opponent_wallet_address && (
          <button
            onClick={handleWorldChat}
            className="w-full bg-surface2 border border-border rounded-2xl py-3.5 flex items-center justify-center gap-2.5 mb-3 active:scale-[0.98] transition-transform slide-up"
            style={{ animationDelay: '0.25s' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M16 9C16 12.866 12.866 16 9 16C7.84 16 6.75 15.713 5.8 15.204L2 16L2.796 12.2C2.287 11.25 2 10.16 2 9C2 5.134 5.134 2 9 2C12.866 2 16 5.134 16 9Z" stroke="#A1A1AA" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
            <span className="text-textMuted text-sm font-semibold">Chat with {truncate(data.opponent_wallet_address)}</span>
            <span className="text-primary text-xs font-semibold ml-auto">World Chat →</span>
          </button>
        )}

        <div className="flex-1" />

        {/* Action buttons */}
        <div className="safe-bottom flex flex-col gap-2.5">
          <button
            onClick={handlePlayAgain}
            className="w-full bg-primary active:scale-[0.98] transition-transform rounded-2xl py-5 text-white font-black text-xl btn-glow"
          >
            Play Again
          </button>
          <button
            onClick={handleHome}
            className="w-full bg-surface border border-border active:scale-[0.98] transition-transform rounded-2xl py-4 text-textMuted font-semibold"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  )
}
