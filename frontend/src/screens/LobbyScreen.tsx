import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStake } from '../hooks/useStake'
import { useMatchmaking } from '../hooks/useMatchmaking'
import StakeSelector from '../components/StakeSelector'
import LoadingSpinner from '../components/LoadingSpinner'
import type { StakeAmount } from '../types'

export default function LobbyScreen() {
  const navigate = useNavigate()
  const [selectedStake, setSelectedStake] = useState<StakeAmount>(1)
  const { stake, isLoading: isStaking, error: stakeError } = useStake()
  const { startSearching, stopSearching, isSearching } = useMatchmaking()
  const [waitSecs, setWaitSecs] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const nullifierHash = sessionStorage.getItem('nullifier_hash') ?? ''

  useEffect(() => {
    if (!nullifierHash) navigate('/verify')
  }, [nullifierHash, navigate])

  useEffect(() => {
    if (isSearching) {
      timerRef.current = setInterval(() => setWaitSecs(s => s + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setWaitSecs(0)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isSearching])

  const handleFind = async () => {
    const result = await stake(selectedStake, nullifierHash)
    if (result) startSearching(nullifierHash)
  }

  const handleCancel = async () => {
    await stopSearching(nullifierHash)
  }

  const fmtTime = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
  const potentialWin = (selectedStake * 2 * 0.9).toFixed(2)

  if (isSearching) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-5 page-enter">
        <div className="max-w-[430px] w-full flex flex-col items-center gap-8">
          {/* Radar animation */}
          <div className="relative flex items-center justify-center w-44 h-44">
            <div className="absolute inset-0 rounded-full border-2 border-primary/30 radar-ring" />
            <div className="absolute inset-0 rounded-full border-2 border-primary/20 radar-ring-delay" />
            <div className="absolute inset-0 rounded-full border-2 border-primary/10 radar-ring-delay2" />
            {/* Inner circle */}
            <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/50 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M16 4C9.373 4 4 9.373 4 16C4 22.627 9.373 28 16 28C22.627 28 28 22.627 28 16" stroke="#6C63FF" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M22 10L16 16L20 20" stroke="#6C63FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Text */}
          <div className="text-center flex flex-col gap-2">
            <h2 className="text-2xl font-black text-textPrimary">Finding an opponent...</h2>
            <div className="flex items-center justify-center gap-2">
              <span className="text-textMuted text-sm">Stake:</span>
              <span className="text-gold font-bold text-sm">{selectedStake} WLD</span>
              <span className="text-textFaint text-sm">·</span>
              <span className="text-textFaint text-sm">{fmtTime(waitSecs)}</span>
            </div>
          </div>

          {/* Bouncing dots */}
          <div className="flex items-end gap-2 h-6">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-primary"
                style={{ animation: 'dot-bounce 1.2s ease-in-out infinite', animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>

          <button
            onClick={handleCancel}
            className="px-8 py-3 rounded-xl border border-border text-textMuted text-sm font-semibold active:scale-95 transition-transform"
          >
            Cancel Search
          </button>
        </div>

        <style>{`
          @keyframes dot-bounce {
            0%, 80%, 100% { transform: translateY(0) scale(0.8); opacity: 0.4; }
            40% { transform: translateY(-10px) scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col page-enter">
      <div className="max-w-[430px] w-full mx-auto flex flex-col flex-1 px-4">
        {/* Header */}
        <div className="flex items-center gap-3 safe-top pb-6">
          <button
            onClick={() => navigate('/home')}
            className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center active:scale-90 transition-transform"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14L6 9L11 4" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="text-xl font-black text-textPrimary">Choose Stake</h1>
        </div>

        {/* Info banner */}
        <div className="bg-primary/8 border border-primary/20 rounded-2xl px-4 py-3.5 mb-5 fade-in">
          <p className="text-textMuted text-sm leading-relaxed">
            Both players stake equal WLD. Winner takes{' '}
            <span className="text-primary font-semibold">90%</span> of the pot — loser gets nothing.
          </p>
        </div>

        {/* Stake selector */}
        <StakeSelector selected={selectedStake} onChange={setSelectedStake} disabled={isStaking} />

        {/* Payout preview */}
        <div className="bg-surface border border-border rounded-2xl px-4 py-4 mt-3 flex items-center justify-between slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex flex-col gap-0.5">
            <span className="text-textFaint text-xs">Your stake</span>
            <span className="text-textPrimary font-bold text-lg">{selectedStake} WLD</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-surface2 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="#52525B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex flex-col gap-0.5 items-end">
            <span className="text-textFaint text-xs">If you win</span>
            <span className="text-gold font-black text-lg gold-glow">{potentialWin} WLD</span>
          </div>
        </div>

        {/* Error */}
        {stakeError && (
          <div className="mt-3 bg-error/10 border border-error/30 rounded-xl px-4 py-3 shake">
            <p className="text-error text-sm">{stakeError}</p>
          </div>
        )}

        <div className="flex-1" />

        {/* CTA */}
        <div className="safe-bottom">
          <button
            onClick={handleFind}
            disabled={isStaking}
            className="w-full bg-primary disabled:opacity-60 active:scale-[0.98] transition-transform rounded-2xl py-5 text-white font-black text-xl btn-glow flex items-center justify-center gap-3"
          >
            {isStaking ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Processing payment...</span>
              </>
            ) : (
              <>
                <span>Find Opponent</span>
                <span className="opacity-70 text-base font-semibold">· {selectedStake} WLD</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
