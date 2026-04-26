// ─── Stake tiers ────────────────────────────────────────────────────────────
export type StakeAmount = 0.5 | 1 | 2;

// ─── Database models ─────────────────────────────────────────────────────────
export interface User {
  id: string;
  nullifier_hash: string;
  wallet_address: string;
  elo_rating: number;
  games_played: number;
  games_won: number;
  total_wld_earned: number;
  notification_permission: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Game {
  id: string;
  player1_nullifier: string;
  player2_nullifier: string;
  player1_wallet: string;
  player2_wallet: string;
  stake_amount: number;
  status: 'waiting' | 'active' | 'finished' | 'cancelled';
  player1_score: number;
  player2_score: number;
  winner_nullifier: string | null;
  winner_wallet: string | null;
  contract_game_id: string | null;
  payout_tx_hash: string | null;
  started_at: Date | null;
  finished_at: Date | null;
  created_at: Date;
}

export interface GameRound {
  id: string;
  game_id: string;
  round_number: number;
  question_id: string;
  question_text: string;
  correct_answer: number;
  difficulty: 'easy' | 'medium' | 'hard';
  player1_answer: number | null;
  player1_time_ms: number | null;
  player2_answer: number | null;
  player2_time_ms: number | null;
  round_winner: 'player1' | 'player2' | 'tie' | null;
  created_at: Date;
}

export interface Question {
  id: string;
  question_text: string;
  correct_answer: number;
  difficulty: 'easy' | 'medium' | 'hard';
  created_at: Date;
}

export interface MatchmakingQueue {
  id: string;
  nullifier_hash: string;
  wallet_address: string;
  stake_amount: number;
  socket_id: string | null;
  status: 'waiting' | 'matched';
  created_at: Date;
  expires_at: Date;
}

export interface PaymentNonce {
  id: string;
  wallet_address: string | null;
  used: boolean;
  created_at: Date;
}

// ─── Socket event payloads ────────────────────────────────────────────────────
export interface GameStartedPayload {
  game_id: string;
  opponent_nullifier: string;
  opponent_wallet: string;
  stake_amount: StakeAmount;
  player_number: 1 | 2;
  starts_at: string; // ISO timestamp
}

export interface RoundStartPayload {
  game_id: string;
  round_number: number;
  question_text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  time_limit_ms: number;
}

export interface RoundResultPayload {
  game_id: string;
  round_number: number;
  correct_answer: number;
  player1_answer: number | null;
  player1_time_ms: number | null;
  player2_answer: number | null;
  player2_time_ms: number | null;
  round_winner: 'player1' | 'player2' | 'tie';
  player1_score: number;
  player2_score: number;
}

export interface GameOverPayload {
  game_id: string;
  is_tie: boolean;
  winner_nullifier: string | null;
  winner_wallet: string | null;
  player1_score: number;
  player2_score: number;
  stake_amount: number;
  payout_tx_hash: string;
}

// ─── Request augmentation ─────────────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
