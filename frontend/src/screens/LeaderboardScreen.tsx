import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLeaderboard } from '../lib/api'
import type { LeaderboardEntry } from '../types'

function SkeletonRow() {
  return (
    <div className="flex items-center px-4 py-3.5 gap-3 border-b border-border last:border-b-0">
      <div className="skeleton w-6 h-4 rounded" />
      <div className="skeleton w-9 h-9 rounded-full" />
      <div className="flex flex-col gap-1.5 flex-1">
        <div className="skeleton h-3 w-28 rounded" />
        <div className="skeleton h-2.5 w-16 rounded" />
      </div>
      <div className="skeleton h-4 w-10 rounded" />
    </div>
  )
}

function Medal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>
  if (rank === 2) return <span className="text-lg">🥈</span>
  if (rank === 3) return <span className="text-lg">🥉</span>
  return <span className="text-textFaint text-xs font-bold w-5 text-center">{rank}</span>
}

function truncate(addr: string) {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export default function LeaderboardScreen() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const myNullifier = sessionStorage.getItem('nullifier_hash')

  useEffect(() => {
    getLeaderboard(50)
      .then(setEntries)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-bg flex flex-col page-enter">
      <div className="max-w-[430px] w-full mx-auto flex flex-col flex-1">
        {/* Sticky header */}
        <div className="flex items-center gap-3 px-4 safe-top pb-4 sticky top-0 bg-bg/95 backdrop-blur-sm border-b border-border z-10">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center active:scale-90 transition-transform shrink-0"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 14L6 9L11 4" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="text-lg">🏆</span>
          <h1 className="text-xl font-black text-textPrimary">Leaderboard</h1>
        </div>

        {/* List */}
        <div className="flex flex-col divide-y divide-border">
          {isLoading
            ? Array.from({ length: 10 }, (_, i) => <SkeletonRow key={i} />)
            : entries.map((entry, i) => {
                const isMe = entry.nullifier_hash === myNullifier
                return (
                  <div
                    key={entry.nullifier_hash}
                    className={`flex items-center px-4 py-3.5 gap-3 fade-in ${
                      isMe ? 'bg-primary/8 border-l-2 border-l-primary' : ''
                    }`}
                    style={{ animationDelay: `${Math.min(i * 0.03, 0.4)}s` }}
                  >
                    <div className="w-7 flex items-center justify-center shrink-0">
                      <Medal rank={entry.rank} />
                    </div>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                      isMe
                        ? 'bg-primary/20 border border-primary/50 text-primary'
                        : 'bg-surface2 border border-border text-textMuted'
                    }`}>
                      {entry.wallet_address.slice(2, 3).toUpperCase()}
                    </div>
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-bold font-mono truncate ${isMe ? 'text-textPrimary' : 'text-textMuted'}`}>
                          {truncate(entry.wallet_address)}
                        </span>
                        {isMe && <span className="text-[10px] text-primary font-bold bg-primary/15 px-1.5 py-0.5 rounded-full shrink-0">you</span>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-textFaint text-xs">{entry.games_played}g</span>
                        <span className="text-textFaint text-xs">·</span>
                        <span className="text-success text-xs">{entry.win_rate}% WR</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <div className="flex items-center gap-1">
                        <span className="text-gold text-xs">⚡</span>
                        <span className="text-gold text-sm font-black">{entry.elo_rating}</span>
                      </div>
                      <span className="text-textFaint text-xs">{entry.wld_earned.toFixed(1)} WLD</span>
                    </div>
                  </div>
                )
              })
          }

          {!isLoading && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="text-4xl">🏁</span>
              <p className="text-textMuted text-sm">No players yet. Be the first!</p>
            </div>
          )}
        </div>
        <div className="h-8" />
      </div>
    </div>
  )
}
