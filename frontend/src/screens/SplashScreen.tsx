import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MiniKit } from '@worldcoin/minikit-js'
import { getUserProfile } from '../lib/api'
import { useGameStore } from '../store/gameStore'
import type { User } from '../types'

export default function SplashScreen() {
  const navigate = useNavigate()
  const { setUser } = useGameStore()
  const [notInWorldApp, setNotInWorldApp] = useState(false)

  useEffect(() => {
    const init = async () => {
      await new Promise(r => setTimeout(r, 700))

      if (!MiniKit.isInstalled()) {
        setNotInWorldApp(true)
        return
      }

      const nullifierHash = sessionStorage.getItem('nullifier_hash')
      if (!nullifierHash) {
        navigate('/verify')
        return
      }

      try {
        const profile = await getUserProfile(nullifierHash)
        const user: User = {
          nullifier_hash: profile.nullifier_hash,
          wallet_address: profile.wallet_address,
          elo_rating: profile.elo_rating,
          games_played: profile.games_played,
          wins: profile.wins,
          losses: profile.losses,
          ties: profile.ties,
          wld_earned: profile.wld_earned,
          created_at: '',
        }
        setUser(user)
        navigate('/home')
      } catch {
        sessionStorage.removeItem('nullifier_hash')
        sessionStorage.removeItem('wallet_address')
        navigate('/verify')
      }
    }

    init()
  }, [navigate, setUser])

  if (notInWorldApp) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 page-enter">
        <div className="max-w-[380px] w-full flex flex-col items-center gap-8 text-center">
          <div className="w-20 h-20 rounded-full bg-surface2 border border-border flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="17" stroke="#6C63FF" strokeWidth="2.5" />
              <path d="M13 14L20 28L27 14" stroke="#6C63FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
              <span className="text-3xl font-black text-white">N</span>
            </div>
            <h1 className="text-3xl font-black text-textPrimary">Numix</h1>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-textPrimary">Open in World App</h2>
            <p className="text-textMuted text-sm leading-relaxed">
              Numix is a World App mini app. Open this link inside World App to play.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6">
      <div className="max-w-[380px] w-full flex flex-col items-center gap-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-primary opacity-20 blur-xl scale-110 animate-float" />
            <div className="relative w-28 h-28 rounded-3xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/50 animate-float">
              <span className="text-6xl font-black text-white tracking-tighter">N</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-4xl font-black text-textPrimary tracking-tight">Numix</h1>
            <p className="text-textFaint text-sm tracking-widest uppercase">Math Duels</p>
          </div>
        </div>

        {/* Loading indicator */}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              style={{ animation: 'dot-bounce 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: translateY(0) scale(0.8); opacity: 0.4; }
          40% { transform: translateY(-8px) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
