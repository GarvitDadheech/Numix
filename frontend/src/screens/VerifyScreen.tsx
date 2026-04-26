import { useNavigate } from 'react-router-dom'
import { useVerifyHuman } from '../hooks/useVerifyHuman'
import WorldIDButton from '../components/WorldIDButton'

const FEATURES = [
  { icon: '🧮', label: '5 rounds of math challenges' },
  { icon: '⚡', label: 'Speed + accuracy both count' },
  { icon: '💰', label: 'Win real WLD from your opponent' },
  { icon: '🏆', label: 'Climb the global leaderboard' },
]

export default function VerifyScreen() {
  const navigate = useNavigate()
  const { verify, isLoading, error } = useVerifyHuman()

  const handleVerify = async () => {
    const result = await verify()
if (result) navigate('/home')
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col px-5 page-enter">
      <div className="max-w-[430px] w-full mx-auto flex flex-col flex-1">
        {/* Logo */}
        <div className="flex flex-col items-center safe-top pb-8 gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-primary opacity-25 blur-lg scale-110" />
            <div className="relative w-18 h-18 w-[72px] h-[72px] rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/40">
              <span className="text-[2rem] font-black text-white">N</span>
            </div>
          </div>
          <h1 className="text-[1.75rem] font-black text-textPrimary tracking-tight">Numix</h1>
        </div>

        {/* Hero text */}
        <div className="flex flex-col gap-2 mb-7">
          <h2 className="text-2xl font-black text-textPrimary leading-tight">
            1v1 Math Duels.<br />Real Stakes.
          </h2>
          <p className="text-textMuted text-[0.95rem] leading-relaxed">
            Prove you're human, stake WLD, and outmath your opponent in real time.
          </p>
        </div>

        {/* Feature list */}
        <div className="flex flex-col gap-2.5 mb-6">
          {FEATURES.map(({ icon, label }, i) => (
            <div
              key={label}
              className="flex items-center gap-3 bg-surface rounded-xl px-4 py-3.5 border border-border slide-up"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <span className="text-xl w-7 text-center flex-shrink-0">{icon}</span>
              <span className="text-textMuted text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-error/10 border border-error/30 rounded-xl px-4 py-3 mb-4 shake">
            <p className="text-error text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="flex-1" />

        {/* Footer + button */}
        <div className="safe-bottom flex flex-col gap-3">
          <p className="text-textFaint text-xs text-center px-2">
            World ID verification ensures one account per human — no bots, no alt accounts.
          </p>
          <WorldIDButton onClick={handleVerify} isLoading={isLoading} />
        </div>
      </div>
    </div>
  )
}
