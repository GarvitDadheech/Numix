import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMatchmakingStatus, leaveMatchmaking } from '../lib/api'
import { connectSocket } from '../lib/socket'
import { useGameStore } from '../store/gameStore'
import type { GameStartedPayload } from '../types'

interface UseMatchmakingResult {
  startSearching: (nullifierHash: string) => void
  stopSearching: (nullifierHash: string) => void
  isSearching: boolean
  matchedGameId: string | null
}

export function useMatchmaking(): UseMatchmakingResult {
  const [isSearching, setIsSearching] = useState(false)
  const [matchedGameId, setMatchedGameId] = useState<string | null>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const navigate = useNavigate()
  const { setMatchStatus, setOpponentInfo } = useGameStore()

  const clearPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  const startSearching = useCallback(
    (nullifierHash: string) => {
      setIsSearching(true)
      setMatchStatus('searching')
      setMatchedGameId(null)

      pollIntervalRef.current = setInterval(async () => {
        try {
          const { status, game_id } = await getMatchmakingStatus(nullifierHash)

          if (status === 'matched' && game_id) {
            clearPolling()
            setIsSearching(false)
            setMatchStatus('matched')
            setMatchedGameId(game_id)

            // Connect socket and join game room
            const socket = connectSocket(nullifierHash)

            socket.emit('join_game', { game_id, nullifier_hash: nullifierHash })

            // Listen for game_started once
            socket.once('game_started', (payload: GameStartedPayload) => {
              setOpponentInfo(payload.opponent)
              navigate(`/game/${game_id}`)
            })

            // Navigate immediately if game_started isn't sent (already started)
            setTimeout(() => {
              navigate(`/game/${game_id}`)
            }, 1500)
          }
        } catch {
          // Silently ignore polling errors
        }
      }, 2000)
    },
    [clearPolling, navigate, setMatchStatus, setOpponentInfo]
  )

  const stopSearching = useCallback(
    async (nullifierHash: string) => {
      clearPolling()
      setIsSearching(false)
      setMatchStatus('idle')
      try {
        await leaveMatchmaking(nullifierHash)
      } catch {
        // Ignore error when leaving
      }
    },
    [clearPolling, setMatchStatus]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPolling()
    }
  }, [clearPolling])

  return { startSearching, stopSearching, isSearching, matchedGameId }
}
