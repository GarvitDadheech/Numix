import { useState, useEffect, useRef, useCallback } from 'react'

interface QuestionCardProps {
  questionText: string
  timeLimit: number
  onSubmit: (answer: number, timeMs: number) => void
  disabled?: boolean
}

const DIGITS = ['7', '8', '9', '4', '5', '6', '1', '2', '3']
const RADIUS = 30
const CIRC = 2 * Math.PI * RADIUS

function vibrate(ms = 8) {
  if ('vibrate' in navigator) navigator.vibrate(ms)
}

export default function QuestionCard({ questionText, timeLimit, onSubmit, disabled = false }: QuestionCardProps) {
  const [display, setDisplay] = useState('')
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [submitted, setSubmitted] = useState(false)
  const [pressedKey, setPressedKey] = useState<string | null>(null)
  const startRef = useRef(Date.now())
  const submittedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const progress = timeLeft / timeLimit
  const dashOffset = CIRC * (1 - progress)
  const isDanger = timeLeft <= 5
  const isWarning = timeLeft <= 10 && timeLeft > 5
  const ringColor = isDanger ? '#EF4444' : isWarning ? '#F5B800' : '#6C63FF'

  const doSubmit = useCallback((val: string) => {
    if (submittedRef.current || disabled) return
    submittedRef.current = true
    setSubmitted(true)
    if (timerRef.current) clearInterval(timerRef.current)
    const answer = val === '' ? -999 : parseInt(val, 10)
    onSubmit(answer, Date.now() - startRef.current)
    vibrate(15)
  }, [disabled, onSubmit])

  // Reset on new question
  useEffect(() => {
    submittedRef.current = false
    setSubmitted(false)
    setDisplay('')
    setTimeLeft(timeLimit)
    startRef.current = Date.now()

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const next = parseFloat((prev - 0.05).toFixed(3))
        if (next <= 0) {
          clearInterval(timerRef.current!)
          if (!submittedRef.current) {
            submittedRef.current = true
            setSubmitted(true)
            onSubmit(-999, Date.now() - startRef.current)
            vibrate(30)
          }
          return 0
        }
        return next
      })
    }, 50)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [questionText, timeLimit]) // eslint-disable-line react-hooks/exhaustive-deps

  const flashKey = (key: string) => {
    setPressedKey(key)
    setTimeout(() => setPressedKey(null), 80)
  }

  const pressDigit = (d: string) => {
    if (submittedRef.current || disabled) return
    vibrate(6)
    flashKey(d)
    setDisplay(prev => {
      if (prev.length >= 6) return prev
      if (prev === '0') return d
      if (prev === '-0') return '-' + d
      return prev + d
    })
  }

  const pressBackspace = () => {
    if (submittedRef.current || disabled) return
    vibrate(6)
    flashKey('back')
    setDisplay(prev => {
      if (prev === '-') return ''
      return prev.slice(0, -1)
    })
  }

  const pressNeg = () => {
    if (submittedRef.current || disabled) return
    vibrate(6)
    flashKey('neg')
    setDisplay(prev => prev.startsWith('-') ? prev.slice(1) : '-' + prev)
  }

  const canSubmit = !submitted && !disabled && display !== '' && display !== '-'

  return (
    <div className="w-full flex flex-col items-center gap-3 page-enter">
      {/* Question + timer card */}
      <div className={`w-full bg-surface rounded-2xl border ${isDanger ? 'border-error/40' : 'border-border'} p-5 transition-colors duration-300`}>
        <div className="flex items-start justify-between gap-3">
          {/* Question text */}
          <div className="flex-1 min-h-[72px] flex items-center">
            <p className="text-[1.6rem] font-extrabold text-textPrimary leading-tight tracking-tight">
              {questionText}
            </p>
          </div>

          {/* Timer SVG */}
          <div className={isDanger ? 'timer-danger' : ''}>
            <svg width="76" height="76" viewBox="0 0 76 76">
              <circle cx="38" cy="38" r={RADIUS} fill="none" stroke="#2A2A2E" strokeWidth="4.5" />
              <circle
                cx="38" cy="38" r={RADIUS}
                fill="none"
                stroke={ringColor}
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 38 38)"
                style={{ transition: 'stroke-dashoffset 0.05s linear, stroke 0.4s ease' }}
              />
              <text
                x="38" y="38"
                textAnchor="middle"
                dominantBaseline="central"
                fill={ringColor}
                fontSize="15"
                fontWeight="800"
                style={{ transition: 'fill 0.3s ease', fontFamily: 'inherit' }}
              >
                {Math.ceil(timeLeft)}
              </text>
            </svg>
          </div>
        </div>

        {/* Answer display */}
        <div className={`mt-4 rounded-xl px-4 py-3 min-h-[54px] flex items-center border transition-all duration-150 ${
          submitted
            ? 'bg-primary/10 border-primary/40'
            : 'bg-surface2 border-border'
        }`}>
          {submitted ? (
            <div className="flex items-center gap-2 slide-up">
              <span className="text-primary text-sm font-semibold">Submitted</span>
              <span className="text-xl font-mono font-bold text-textPrimary">
                {display || '—'}
              </span>
            </div>
          ) : (
            <span className={`text-2xl font-mono font-bold ${display ? 'text-textPrimary' : 'text-textFaint'}`}>
              {display || '—'}
            </span>
          )}
        </div>
      </div>

      {/* Numpad grid */}
      <div className="w-full grid grid-cols-3 gap-2">
        {DIGITS.map(d => (
          <button
            key={d}
            className={`numpad-btn ${pressedKey === d ? 'pressed' : ''}`}
            onPointerDown={() => pressDigit(d)}
            disabled={submitted || disabled}
          >
            {d}
          </button>
        ))}

        {/* Bottom row: +/- | 0 | backspace */}
        <button
          className={`numpad-btn text-base ${pressedKey === 'neg' ? 'pressed' : ''}`}
          onPointerDown={pressNeg}
          disabled={submitted || disabled}
        >
          +/−
        </button>
        <button
          className={`numpad-btn ${pressedKey === '0' ? 'pressed' : ''}`}
          onPointerDown={() => pressDigit('0')}
          disabled={submitted || disabled}
        >
          0
        </button>
        <button
          className={`numpad-btn ${pressedKey === 'back' ? 'pressed' : ''}`}
          onPointerDown={pressBackspace}
          disabled={submitted || disabled}
        >
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <path d="M22 5H8L2 13L8 21H22V5Z" stroke="#A1A1AA" strokeWidth="2" strokeLinejoin="round" />
            <path d="M16 10L12 14M12 10L16 14" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* Submit — full width */}
        <button
          onPointerDown={() => doSubmit(display)}
          disabled={!canSubmit}
          className={`col-span-3 py-[17px] rounded-[14px] text-lg font-extrabold tracking-wide transition-all duration-150 ${
            canSubmit
              ? 'bg-primary text-white btn-glow active:scale-[0.97]'
              : 'bg-surface2 text-textFaint cursor-not-allowed border border-border'
          }`}
        >
          {submitted ? 'Waiting...' : 'Submit Answer'}
        </button>
      </div>
    </div>
  )
}
