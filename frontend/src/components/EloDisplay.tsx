interface EloDisplayProps {
  elo: number
  className?: string
}

export default function EloDisplay({ elo, className = '' }: EloDisplayProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="text-gold text-sm">⚡</span>
      <span className="text-gold font-semibold text-sm">{elo}</span>
      <span className="text-textFaint text-xs">ELO</span>
    </div>
  )
}
