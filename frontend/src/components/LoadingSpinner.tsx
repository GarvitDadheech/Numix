interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-[2.5px]',
  lg: 'w-12 h-12 border-[3px]',
}

export default function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  return (
    <div
      className={`${sizes[size]} rounded-full border-border border-t-primary animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}
