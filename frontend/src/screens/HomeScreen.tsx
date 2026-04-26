import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserProfile } from '../lib/api'
import { useGameStore } from '../store/gameStore'
import LoadingSpinner from '../components/LoadingSpinner'
import type { User } from '../types'

function truncate(addr: string) {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function StatCard({ value, label, color = 'text-textPrimary', delay = 0 }: {
  value: string | number
  label: string
  color?: string
  delay?: number
}) {
  return (
    <div
      className="bg-surface border border-border rounded-2xl flex flex-col items-center justify-center gap-1 py-4 px-2 slide-up"
      style={{ animationDelay: `${delay}s` }}
    >
      <span className={`text-2xl font-black ${color} leading-none`}>{value}</span>
      <span className="text-textFaint text-xs text-center font-medium">{label}</span>
    </div>
  )
}

export default function HomeScreen() {
  const navigate = useNavigate()
  const { user, setUser } = useGameStore()
  const [isLoading, setIsLoading] = useState(!user)

  useEffect(() => {
    const nullifierHash = sessionStorage.getItem('nullifier_hash')
    if (!nullifierHash) { navigate('/verify'); return }
    if (user) { setIsLoading(false); return }

    getUserProfile(nullifierHash)
      .then(p => {
        const u: User = {
          nullifier_hash: p.nullifier_hash,
          wallet_address: p.wallet_address,
          elo_rating: p.elo_rating,
          games_played: p.games_played,
          wins: p.wins,
          losses: p.losses,
          ties: p.ties,
          wld_earned: p.wld_earned,
          created_at: '',
        }
        setUser(u)
      })
      .catch(() => {
        sessionStorage.removeItem('nullifier_hash')
        navigate('/verify')
      })
      .finally(() => setIsLoading(false))
  }, [navigate, user, setUser])

  const winRate = user && user.games_played > 0
    ? Math.round((user.wins / user.games_played) * 100)
    : 0

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-textFaint text-sm">Loading your stats...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col page-enter">
      <div className="max-w-[430px] w-full mx-auto flex flex-col flex-1 px-4">
        {/* Header */}
        <div className="flex items-center justify-between safe-top pb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow shadow-primary/40">
              <span className="text-sm font-black text-white">N</span>
            </div>
            <span className="text-lg font-black text-textPrimary tracking-tight">Numix</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-surface border border-border rounded-full px-3 py-1.5">
              <span className="text-gold text-xs">⚡</span>
              <span className="text-gold text-xs font-bold">{user?.elo_rating ?? 1000}</span>
              <span className="text-textFaint text-xs">ELO</span>
            </div>
          </div>
        </div>

        {/* Wallet card */}
        {user && (
          <div className="bg-surface border border-border rounded-2xl px-4 py-3.5 mb-5 flex items-center gap-3 fade-in">
            <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-black text-sm">
                {user.wallet_address?.slice(2, 3).toUpperCase() || 'W'}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-textFaint text-xs">Connected wallet</span>
              <span className="text-textPrimary font-mono text-sm font-semibold truncate">
                {truncate(user.wallet_address)}
              </span>
            </div>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          <StatCard value={user?.games_played ?? 0} label="Games" delay={0.05} />
          <StatCard value={`${winRate}%`} label="Win Rate" color="text-success" delay={0.1} />
          <StatCard value={(user?.wld_earned ?? 0).toFixed(1)} label="WLD Earned" color="text-gold" delay={0.15} />
        </div>

        {/* W / L / T */}
        <div className="flex gap-2.5 mb-6">
          <div className="flex-1 bg-success/8 border border-success/20 rounded-xl py-3 flex flex-col items-center gap-0.5 slide-up" style={{ animationDelay: '0.2s' }}>
            <span className="text-success font-black text-xl leading-none">{user?.wins ?? 0}</span>
            <span className="text-textFaint text-xs">Wins</span>
          </div>
          <div className="flex-1 bg-error/8 border border-error/20 rounded-xl py-3 flex flex-col items-center gap-0.5 slide-up" style={{ animationDelay: '0.25s' }}>
            <span className="text-error font-black text-xl leading-none">{user?.losses ?? 0}</span>
            <span className="text-textFaint text-xs">Losses</span>
          </div>
          <div className="flex-1 bg-surface border border-border rounded-xl py-3 flex flex-col items-center gap-0.5 slide-up" style={{ animationDelay: '0.3s' }}>
            <span className="text-textMuted font-black text-xl leading-none">{user?.ties ?? 0}</span>
            <span className="text-textFaint text-xs">Ties</span>
          </div>
        </div>

        {/* Leaderboard link */}
        <button
          onClick={() => navigate('/leaderboard')}
          className="w-full bg-surface2 border border-border rounded-2xl py-3.5 text-textMuted font-semibold text-base mb-3 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 slide-up"
          style={{ animationDelay: '0.35s' }}
        >
          <span className="text-lg">🏆</span>
          <span>Leaderboard</span>
          <svg className="ml-auto" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 4L10 8L6 12" stroke="#52525B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="flex-1" />

        {/* Play CTA */}
        <div className="safe-bottom">
          <button
            onClick={() => navigate('/lobby')}
            className="w-full bg-primary active:scale-[0.98] transition-transform rounded-2xl py-5 text-white font-black text-xl btn-glow"
          >
            Play Now
          </button>
        </div>
      </div>
    </div>
  )
}
