import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useGame } from '../hooks/useGame'
import { useGameStore } from '../store/gameStore'
import QuestionCard from '../components/QuestionCard'
import LoadingSpinner from '../components/LoadingSpinner'
import type { RoundResultPayload } from '../types'

function truncate(addr: string) {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function ScoreNum({ score, animate }: { score: number; animate: boolean }) {
  return (
    <span
      key={score}
      className={`text-3xl font-black leading-none transition-all duration-300 ${animate ? 'score-change text-primary' : 'text-textPrimary'}`}
    >
      {score}
    </span>
  )
}

interface RoundResultOverlayProps {
  result: RoundResultPayload
  onClose: () => void
}

function RoundResultOverlay({ result, onClose }: RoundResultOverlayProps) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const start = Date.now()
    const duration = 2400
    const tick = setInterval(() => {
      const elapsed = Date.now() - start
      setProgress(Math.max(0, 100 - (elapsed / duration) * 100))
      if (elapsed >= duration) { clearInterval(tick); onClose() }
    }, 30)
    return () => clearInterval(tick)
  }, [onClose])

  const { round_winner, correct_answer, your_answer, opponent_answer, your_time_ms, opponent_time_ms, round_number, your_score, opponent_score } = result

  const youWon = round_winner === 'you'
  const tie = round_winner === 'tie'

  const winnerLabel = youWon ? 'You won this round!' : tie ? "It's a tie!" : 'They got it!'
  const winnerColor = youWon ? 'text-success' : tie ? 'text-gold' : 'text-error'
  const borderColor = youWon ? 'border-success/30' : tie ? 'border-gold/30' : 'border-error/30'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm px-4 pb-6">
      <div className={`w-full max-w-[398px] bg-surface border ${borderColor} rounded-2xl overflow-hidden overlay-enter`}>
        {/* Progress bar */}
        <div className="h-0.5 bg-border">
          <div
            className={`h-full transition-none ${youWon ? 'bg-success' : tie ? 'bg-gold' : 'bg-error'}`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-textFaint text-xs font-medium">Round {round_number}</span>
            <span className={`text-base font-black ${winnerColor}`}>{winnerLabel}</span>
          </div>

          {/* Correct answer */}
          <div className="bg-surface2 rounded-xl px-4 py-3 text-center border border-border">
            <p className="text-textFaint text-xs mb-1">Correct answer</p>
            <p className="text-2xl font-black text-success">{correct_answer}</p>
          </div>

          {/* Both answers */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className={`rounded-xl px-3 py-3 flex flex-col items-center gap-1 border ${your_answer === correct_answer ? 'bg-success/8 border-success/25' : 'bg-error/8 border-error/25'}`}>
              <p className="text-textFaint text-xs">You</p>
              <p className={`text-xl font-black ${your_answer === correct_answer ? 'text-success' : 'text-error'}`}>
                {your_answer != null ? your_answer : '—'}
              </p>
              {your_time_ms != null && (
                <p className="text-textFaint text-xs">{(your_time_ms / 1000).toFixed(2)}s</p>
              )}
            </div>
            <div className={`rounded-xl px-3 py-3 flex flex-col items-center gap-1 border ${opponent_answer === correct_answer ? 'bg-success/8 border-success/25' : 'bg-error/8 border-error/25'}`}>
              <p className="text-textFaint text-xs">Them</p>
              <p className={`text-xl font-black ${opponent_answer === correct_answer ? 'text-success' : 'text-error'}`}>
                {opponent_answer != null ? opponent_answer : '—'}
              </p>
              {opponent_time_ms != null && (
                <p className="text-textFaint text-xs">{(opponent_time_ms / 1000).toFixed(2)}s</p>
              )}
            </div>
          </div>

          {/* Score */}
          <div className="flex items-center justify-center gap-5">
            <span className="text-2xl font-black text-textPrimary">{your_score}</span>
            <span className="text-textFaint text-sm font-bold">vs</span>
            <span className="text-2xl font-black text-textMuted">{opponent_score}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ThinkingDots() {
  return (
    <div className="flex items-end gap-1.5 h-5">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-textFaint"
          style={{ animation: 'dot-bounce 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }}
        />
      ))}
      <style>{`
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: translateY(0) scale(0.8); opacity: 0.4; }
          40% { transform: translateY(-6px) scale(1); opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}

export default function GameScreen() {
  const { gameId } = useParams<{ gameId: string }>()
  const { currentGame } = useGameStore()
  const { currentRound, roundData, lastResult, submitAnswer, opponentInfo } = useGame(gameId ?? '')

  const [hasAnswered, setHasAnswered] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [displayedResult, setDisplayedResult] = useState<RoundResultPayload | null>(null)
  const [prevYourScore, setPrevYourScore] = useState(0)
  const [prevOppScore, setPrevOppScore] = useState(0)
  const [yourScoreAnimated, setYourScoreAnimated] = useState(false)
  const [oppScoreAnimated, setOppScoreAnimated] = useState(false)

  const walletAddress = sessionStorage.getItem('wallet_address') ?? ''
  const stakeAmount = currentGame?.stake_amount ?? 1
  const yourScore = lastResult?.your_score ?? 0
  const opponentScore = lastResult?.opponent_score ?? 0
  const totalRounds = roundData?.totalRounds ?? 5

  // Track score changes for animation
  const scoreInitRef = useRef(false)
  useEffect(() => {
    if (!scoreInitRef.current) { scoreInitRef.current = true; return }
    if (yourScore !== prevYourScore) {
      setYourScoreAnimated(true)
      setPrevYourScore(yourScore)
      setTimeout(() => setYourScoreAnimated(false), 400)
    }
    if (opponentScore !== prevOppScore) {
      setOppScoreAnimated(true)
      setPrevOppScore(opponentScore)
      setTimeout(() => setOppScoreAnimated(false), 400)
    }
  }, [yourScore, opponentScore]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (lastResult) {
      setDisplayedResult(lastResult)
      setShowResult(true)
      setHasAnswered(false)
    }
  }, [lastResult])

  useEffect(() => {
    setHasAnswered(false)
  }, [currentRound])

  const handleSubmit = useCallback((answer: number, timeMs: number) => {
    setHasAnswered(true)
    submitAnswer(answer, timeMs)
  }, [submitAnswer])

  const handleResultClose = useCallback(() => {
    setShowResult(false)
    setDisplayedResult(null)
  }, [])

  if (!roundData && !hasAnswered) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-5">
        <LoadingSpinner size="lg" />
        <p className="text-textMuted text-sm">Game starting...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="max-w-[430px] w-full mx-auto flex flex-col flex-1 px-4">
        {/* Round header */}
        <div className="flex items-center justify-between safe-top pb-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-textFaint text-xs">Round</span>
            <span className="text-textPrimary font-black text-lg">{currentRound}/{totalRounds}</span>
          </div>

          {/* Round dots */}
          <div className="flex gap-1.5">
            {Array.from({ length: totalRounds }, (_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i < currentRound ? 'bg-primary scale-110' : 'bg-border'
                }`}
              />
            ))}
          </div>

          <div className="flex flex-col items-end gap-0.5">
            <span className="text-textFaint text-xs">Stake</span>
            <span className="text-gold font-black text-lg">{stakeAmount} WLD</span>
          </div>
        </div>

        {/* Players row */}
        <div className="bg-surface border border-border rounded-2xl px-4 py-3.5 mb-4 flex items-center justify-between">
          {/* You */}
          <div className="flex flex-col items-center gap-1.5 min-w-[90px]">
            <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center">
              <span className="text-primary font-black text-sm">
                {walletAddress.slice(2, 3).toUpperCase() || 'Y'}
              </span>
            </div>
            <span className="text-textMuted text-xs font-mono">{truncate(walletAddress) || 'You'}</span>
            <ScoreNum score={yourScore} animate={yourScoreAnimated} />
          </div>

          <div className="flex flex-col items-center">
            <span className="text-textFaint text-xs font-black">VS</span>
          </div>

          {/* Opponent */}
          <div className="flex flex-col items-center gap-1.5 min-w-[90px]">
            <div className="w-10 h-10 rounded-full bg-surface2 border border-border flex items-center justify-center">
              <span className="text-textMuted font-black text-sm">
                {opponentInfo?.wallet_address.slice(2, 3).toUpperCase() ?? '?'}
              </span>
            </div>
            <span className="text-textMuted text-xs font-mono">
              {opponentInfo ? truncate(opponentInfo.wallet_address) : 'Opponent'}
            </span>
            <ScoreNum score={opponentScore} animate={oppScoreAnimated} />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col justify-center gap-4 pb-6">
          {hasAnswered ? (
            <div className="flex flex-col items-center justify-center gap-5 py-10 fade-in">
              <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13L9 17L19 7" stroke="#6C63FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="text-textMuted text-base font-semibold">Answer submitted</p>
                <p className="text-textFaint text-sm">Waiting for opponent</p>
                <ThinkingDots />
              </div>
            </div>
          ) : roundData ? (
            <QuestionCard
              questionText={roundData.question}
              timeLimit={roundData.timeLimitMs / 1000}
              onSubmit={handleSubmit}
              disabled={hasAnswered}
            />
          ) : (
            <div className="flex flex-col items-center gap-4 py-10">
              <LoadingSpinner size="md" />
              <p className="text-textMuted text-sm">Next round loading...</p>
            </div>
          )}
        </div>
      </div>

      {showResult && displayedResult && (
        <RoundResultOverlay result={displayedResult} onClose={handleResultClose} />
      )}
    </div>
  )
}
