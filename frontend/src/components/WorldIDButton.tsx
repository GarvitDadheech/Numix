import LoadingSpinner from './LoadingSpinner'

interface WorldIDButtonProps {
  onClick: () => void
  isLoading?: boolean
}

export default function WorldIDButton({ onClick, isLoading = false }: WorldIDButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`
        w-full py-[18px] px-6 rounded-2xl font-black text-lg text-white
        transition-all duration-150 btn-glow
        flex items-center justify-center gap-3
        ${isLoading
          ? 'bg-primary/70 cursor-not-allowed'
          : 'bg-primary active:scale-[0.97] cursor-pointer'
        }
      `}
    >
      {isLoading ? (
        <>
          <LoadingSpinner size="sm" />
          <span>Verifying...</span>
        </>
      ) : (
        <>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <circle cx="12" cy="12" r="10.5" stroke="white" strokeWidth="2" />
            <path d="M7.5 8.5L12 17L16.5 8.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Prove You're Human</span>
        </>
      )}
    </button>
  )
}
