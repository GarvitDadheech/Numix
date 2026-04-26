import { useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSocket } from '../lib/socket'
import { useGameStore } from '../store/gameStore'
import type { RoundStartPayload, RoundResultPayload, GameOverPayload } from '../types'

interface OpponentInfo {
  nullifier_hash: string
  wallet_address: string
  elo_rating: number
}

interface RoundData {
  question: string
  timeLimitMs: number
  totalRounds: number
}

interface UseGameResult {
  currentRound: number
  roundData: RoundData | null
  lastResult: RoundResultPayload | null
  gameOver: GameOverPayload | null
  submitAnswer: (answer: number, timeMs: number) => void
  opponentInfo: OpponentInfo | null
  awaitingResult: boolean
}

export function useGame(gameId: string): UseGameResult {
  const navigate = useNavigate()
  const {
    currentRound,
    lastRoundResult,
    gameOverData,
    opponentInfo,
    setRound,
    setLastRoundResult,
    setGameStatus,
    setGameOverData,
  } = useGameStore()

  const roundDataRef = useRef<RoundData | null>(null)
  const awaitingResultRef = useRef(false)

  // We store roundData in a ref and also trigger re-renders via the store's currentRound
  const roundDataMap = useRef<Map<number, RoundData>>(new Map())

  useEffect(() => {
    const socket = getSocket()

    const onRoundStart = (payload: RoundStartPayload) => {
      awaitingResultRef.current = false
      const data: RoundData = {
        question: payload.question,
        timeLimitMs: payload.time_limit_ms,
        totalRounds: payload.total_rounds,
      }
      roundDataMap.current.set(payload.round_number, data)
      roundDataRef.current = data
      setRound(payload.round_number)
      setLastRoundResult(null)
      setGameStatus('active')
    }

    const onRoundResult = (payload: RoundResultPayload) => {
      awaitingResultRef.current = false
      setLastRoundResult(payload)

      if (payload.is_last_round) {
        // Wait for game_over
      }
    }

    const onGameOver = (payload: GameOverPayload) => {
      setGameStatus('finished')
      setGameOverData(payload)
      navigate('/result', {
        state: { gameOverData: payload, gameId },
      })
    }

    const onOpponentDisconnected = () => {
      // Treat as game over with win
      navigate('/result', {
        state: { opponentDisconnected: true, gameId },
      })
    }

    socket.on('round_start', onRoundStart)
    socket.on('round_result', onRoundResult)
    socket.on('game_over', onGameOver)
    socket.on('opponent_disconnected', onOpponentDisconnected)

    return () => {
      socket.off('round_start', onRoundStart)
      socket.off('round_result', onRoundResult)
      socket.off('game_over', onGameOver)
      socket.off('opponent_disconnected', onOpponentDisconnected)
    }
  }, [gameId, navigate, setRound, setLastRoundResult, setGameStatus, setGameOverData])

  const submitAnswer = useCallback(
    (answer: number, timeMs: number) => {
      const socket = getSocket()
      awaitingResultRef.current = true
      socket.emit('answer_submitted', {
        game_id: gameId,
        round_number: currentRound,
        answer,
        time_ms: timeMs,
      })
    },
    [gameId, currentRound]
  )

  const currentRoundData = roundDataMap.current.get(currentRound) ?? null

  return {
    currentRound,
    roundData: currentRoundData,
    lastResult: lastRoundResult,
    gameOver: gameOverData,
    submitAnswer,
    opponentInfo,
    awaitingResult: awaitingResultRef.current,
  }
}
