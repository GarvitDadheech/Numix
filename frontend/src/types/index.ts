export type StakeAmount = 0.5 | 1 | 2

export interface User {
  nullifier_hash: string
  wallet_address: string
  elo_rating: number
  games_played: number
  wins: number
  losses: number
  ties: number
  wld_earned: number
  created_at: string
}

export interface GameRound {
  round_number: number
  question: string
  correct_answer: number
  player1_answer: number | null
  player2_answer: number | null
  player1_time_ms: number | null
  player2_time_ms: number | null
  winner_nullifier_hash: string | null
}

export interface Game {
  id: string
  player1_nullifier_hash: string
  player2_nullifier_hash: string
  player1_wallet_address: string
  player2_wallet_address: string
  player1_elo: number
  player2_elo: number
  stake_amount: StakeAmount
  status: 'pending' | 'active' | 'finished'
  winner_nullifier_hash: string | null
  player1_score: number
  player2_score: number
  rounds: GameRound[]
  payout_amount: number | null
  created_at: string
  finished_at: string | null
}

export interface LeaderboardEntry {
  rank: number
  nullifier_hash: string
  wallet_address: string
  elo_rating: number
  games_played: number
  wins: number
  losses: number
  win_rate: number
  wld_earned: number
}

// Socket event payloads
export interface GameStartedPayload {
  game_id: string
  opponent: {
    nullifier_hash: string
    wallet_address: string
    elo_rating: number
  }
  stake_amount: StakeAmount
  your_nullifier_hash: string
}

export interface RoundStartPayload {
  round_number: number
  question: string
  time_limit_ms: number
  total_rounds: number
}

export interface RoundResultPayload {
  round_number: number
  question: string
  correct_answer: number
  your_answer: number | null
  opponent_answer: number | null
  your_time_ms: number | null
  opponent_time_ms: number | null
  round_winner: 'you' | 'opponent' | 'tie'
  your_score: number
  opponent_score: number
  is_last_round: boolean
}

export interface GameOverPayload {
  game_id: string
  winner: 'you' | 'opponent' | 'tie'
  your_score: number
  opponent_score: number
  payout_amount: number | null
  your_elo_change: number
  opponent_elo_change: number
  rounds: GameRound[]
  opponent_wallet_address: string
}
