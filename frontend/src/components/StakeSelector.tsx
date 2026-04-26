import type { StakeAmount } from '../types'
import { STAKE_OPTIONS } from '../lib/constants'

interface StakeSelectorProps {
  selected: StakeAmount
  onChange: (s: StakeAmount) => void
  disabled?: boolean
}

const STAKE_LABELS: Record<number, string> = { 0.5: '0.5', 1: '1', 2: '2' }
const POT_WIN: Record<number, string> = { 0.5: '0.9', 1: '1.8', 2: '3.6' }

export default function StakeSelector({ selected, onChange, disabled = false }: StakeSelectorProps) {
  return (
    <div className="flex gap-2.5 w-full">
      {STAKE_OPTIONS.map(amount => {
        const active = selected === amount
        return (
          <button
            key={amount}
            onPointerDown={() => !disabled && onChange(amount)}
            disabled={disabled}
            className={`
              flex-1 py-4 rounded-2xl flex flex-col items-center gap-1 transition-all duration-150
              border-2 select-none touch-manipulation
              ${active
                ? 'bg-primary border-primary shadow-lg shadow-primary/30 scale-[1.02]'
                : 'bg-surface border-border active:scale-[0.97]'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <span className={`text-2xl font-black leading-none ${active ? 'text-white' : 'text-textMuted'}`}>
              {STAKE_LABELS[amount]}
            </span>
            <span className={`text-xs font-semibold ${active ? 'text-white/70' : 'text-textFaint'}`}>
              WLD
            </span>
            <span className={`text-[10px] font-medium mt-0.5 ${active ? 'text-white/60' : 'text-textFaint'}`}>
              win {POT_WIN[amount]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
