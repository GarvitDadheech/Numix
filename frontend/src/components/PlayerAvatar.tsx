interface PlayerAvatarProps {
  walletAddress: string
  elo?: number
  size?: 'sm' | 'md' | 'lg'
}

const AVATAR_COLORS = [
  'bg-purple-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-red-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
]

function getColorForAddress(address: string): string {
  if (!address) return AVATAR_COLORS[0]
  const char = address.charAt(2) || address.charAt(0)
  const index = parseInt(char, 16) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

function truncateAddress(address: string): string {
  if (!address) return '0x???'
  if (address.length < 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const sizeClasses = {
  sm: { circle: 'w-8 h-8 text-xs', text: 'text-xs', elo: 'text-[10px]' },
  md: { circle: 'w-12 h-12 text-sm', text: 'text-sm', elo: 'text-xs' },
  lg: { circle: 'w-16 h-16 text-lg', text: 'text-base', elo: 'text-sm' },
}

export default function PlayerAvatar({ walletAddress, elo, size = 'md' }: PlayerAvatarProps) {
  const color = getColorForAddress(walletAddress)
  const firstChar = walletAddress ? walletAddress.replace('0x', '').charAt(0).toUpperCase() : '?'
  const classes = sizeClasses[size]

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`${classes.circle} ${color} rounded-full flex items-center justify-center font-bold text-white`}
      >
        {firstChar}
      </div>
      <span className={`${classes.text} text-textMuted font-mono`}>
        {truncateAddress(walletAddress)}
      </span>
      {elo !== undefined && (
        <span className={`${classes.elo} text-gold font-semibold`}>
          ⚡ {elo}
        </span>
      )}
    </div>
  )
}
