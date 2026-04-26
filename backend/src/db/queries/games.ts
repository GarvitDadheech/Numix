import pool from '../pool';
import { Game, GameRound } from '../../types';

export interface CreateGameParams {
  id: string;
  player1_nullifier: string;
  player2_nullifier: string;
  player1_wallet: string;
  player2_wallet: string;
  stake_amount: number;
  contract_game_id?: string;
}

export async function createGame(params: CreateGameParams): Promise<Game> {
  const result = await pool.query<Game>(
    `INSERT INTO games (
       id,
       player1_nullifier,
       player2_nullifier,
       player1_wallet,
       player2_wallet,
       stake_amount,
       status,
       player1_score,
       player2_score,
       winner_nullifier,
       winner_wallet,
       contract_game_id,
       payout_tx_hash,
       started_at,
       finished_at,
       created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, 'active', 0, 0, NULL, NULL, $7, NULL, NOW(), NULL, NOW())
     RETURNING *`,
    [
      params.id,
      params.player1_nullifier,
      params.player2_nullifier,
      params.player1_wallet,
      params.player2_wallet,
      params.stake_amount,
      params.contract_game_id ?? null,
    ]
  );
  return result.rows[0];
}

export async function getGame(gameId: string): Promise<Game | null> {
  const result = await pool.query<Game>(
    `SELECT * FROM games WHERE id = $1`,
    [gameId]
  );
  return result.rows[0] ?? null;
}

export interface UpdateGameParams {
  status?: string;
  player1_score?: number;
  player2_score?: number;
  winner_nullifier?: string;
  winner_wallet?: string;
  payout_tx_hash?: string;
  finished_at?: Date;
  contract_game_id?: string;
}

export async function updateGame(
  gameId: string,
  updates: UpdateGameParams
): Promise<Game | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (updates.status !== undefined) {
    setClauses.push(`status = $${idx++}`);
    values.push(updates.status);
  }
  if (updates.player1_score !== undefined) {
    setClauses.push(`player1_score = $${idx++}`);
    values.push(updates.player1_score);
  }
  if (updates.player2_score !== undefined) {
    setClauses.push(`player2_score = $${idx++}`);
    values.push(updates.player2_score);
  }
  if (updates.winner_nullifier !== undefined) {
    setClauses.push(`winner_nullifier = $${idx++}`);
    values.push(updates.winner_nullifier);
  }
  if (updates.winner_wallet !== undefined) {
    setClauses.push(`winner_wallet = $${idx++}`);
    values.push(updates.winner_wallet);
  }
  if (updates.payout_tx_hash !== undefined) {
    setClauses.push(`payout_tx_hash = $${idx++}`);
    values.push(updates.payout_tx_hash);
  }
  if (updates.finished_at !== undefined) {
    setClauses.push(`finished_at = $${idx++}`);
    values.push(updates.finished_at);
  }
  if (updates.contract_game_id !== undefined) {
    setClauses.push(`contract_game_id = $${idx++}`);
    values.push(updates.contract_game_id);
  }

  if (setClauses.length === 0) return getGame(gameId);

  values.push(gameId);
  const result = await pool.query<Game>(
    `UPDATE games SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0] ?? null;
}

export async function finishGame(
  gameId: string,
  winnerNullifier: string,
  winnerWallet: string,
  payoutTxHash: string
): Promise<Game | null> {
  const result = await pool.query<Game>(
    `UPDATE games
     SET
       status           = 'finished',
       winner_nullifier = $2,
       winner_wallet    = $3,
       payout_tx_hash   = $4,
       finished_at      = NOW()
     WHERE id = $1
     RETURNING *`,
    [gameId, winnerNullifier, winnerWallet, payoutTxHash]
  );
  return result.rows[0] ?? null;
}

export async function getGameHistory(
  nullifier_hash: string,
  limit: number
): Promise<Game[]> {
  const result = await pool.query<Game>(
    `SELECT * FROM games
     WHERE player1_nullifier = $1 OR player2_nullifier = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [nullifier_hash, limit]
  );
  return result.rows;
}

export interface CreateGameRoundParams {
  id: string;
  game_id: string;
  round_number: number;
  question_id: string;
  question_text: string;
  correct_answer: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export async function createGameRound(params: CreateGameRoundParams): Promise<GameRound> {
  const result = await pool.query<GameRound>(
    `INSERT INTO game_rounds (
       id,
       game_id,
       round_number,
       question_id,
       question_text,
       correct_answer,
       difficulty,
       player1_answer,
       player1_time_ms,
       player2_answer,
       player2_time_ms,
       round_winner,
       created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NULL, NULL, NULL, NULL, NOW())
     RETURNING *`,
    [
      params.id,
      params.game_id,
      params.round_number,
      params.question_id,
      params.question_text,
      params.correct_answer,
      params.difficulty,
    ]
  );
  return result.rows[0];
}

export async function updateRoundAnswer(
  gameId: string,
  roundNumber: number,
  playerNum: 1 | 2,
  answer: number,
  timeMs: number
): Promise<GameRound | null> {
  const answerCol = playerNum === 1 ? 'player1_answer' : 'player2_answer';
  const timeCol   = playerNum === 1 ? 'player1_time_ms' : 'player2_time_ms';

  const result = await pool.query<GameRound>(
    `UPDATE game_rounds
     SET ${answerCol} = $3, ${timeCol} = $4
     WHERE game_id = $1 AND round_number = $2
     RETURNING *`,
    [gameId, roundNumber, answer, timeMs]
  );
  return result.rows[0] ?? null;
}

export async function getRound(
  gameId: string,
  roundNumber: number
): Promise<GameRound | null> {
  const result = await pool.query<GameRound>(
    `SELECT * FROM game_rounds WHERE game_id = $1 AND round_number = $2`,
    [gameId, roundNumber]
  );
  return result.rows[0] ?? null;
}

export async function updateRoundWinner(
  gameId: string,
  roundNumber: number,
  winner: 'player1' | 'player2' | 'tie'
): Promise<void> {
  await pool.query(
    `UPDATE game_rounds SET round_winner = $3 WHERE game_id = $1 AND round_number = $2`,
    [gameId, roundNumber, winner]
  );
}
