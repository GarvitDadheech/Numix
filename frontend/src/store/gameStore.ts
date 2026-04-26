import { create } from 'zustand'
import type { User, Game, GameRound, RoundResultPayload, GameOverPayload } from '../types'

interface OpponentInfo {
  nullifier_hash: string
  wallet_address: string
  elo_rating: number
}

type MatchStatus = 'idle' | 'searching' | 'matched'
type GameStatus = 'idle' | 'active' | 'finished'

interface GameStore {
  // State
  user: User | null
  currentGame: Game | null
  currentRound: number
  rounds: GameRound[]
  matchStatus: MatchStatus
  gameStatus: GameStatus
  opponentInfo: OpponentInfo | null
  lastRoundResult: RoundResultPayload | null
  gameOverData: GameOverPayload | null

  // Actions
  setUser: (user: User | null) => void
  setCurrentGame: (game: Game | null) => void
  setRound: (round: number) => void
  addRoundResult: (round: GameRound) => void
  setMatchStatus: (status: MatchStatus) => void
  setGameStatus: (status: GameStatus) => void
  setOpponentInfo: (info: OpponentInfo | null) => void
  setLastRoundResult: (result: RoundResultPayload | null) => void
  setGameOverData: (data: GameOverPayload | null) => void
  resetGame: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  user: null,
  currentGame: null,
  currentRound: 0,
  rounds: [],
  matchStatus: 'idle',
  gameStatus: 'idle',
  opponentInfo: null,
  lastRoundResult: null,
  gameOverData: null,

  setUser: (user) => set({ user }),
  setCurrentGame: (game) => set({ currentGame: game }),
  setRound: (round) => set({ currentRound: round }),
  addRoundResult: (round) =>
    set((state) => ({ rounds: [...state.rounds, round] })),
  setMatchStatus: (status) => set({ matchStatus: status }),
  setGameStatus: (status) => set({ gameStatus: status }),
  setOpponentInfo: (info) => set({ opponentInfo: info }),
  setLastRoundResult: (result) => set({ lastRoundResult: result }),
  setGameOverData: (data) => set({ gameOverData: data }),
  resetGame: () =>
    set({
      currentGame: null,
      currentRound: 0,
      rounds: [],
      matchStatus: 'idle',
      gameStatus: 'idle',
      opponentInfo: null,
      lastRoundResult: null,
      gameOverData: null,
    }),
}))
