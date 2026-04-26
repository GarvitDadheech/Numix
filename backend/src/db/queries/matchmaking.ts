import pool from '../pool';
import { MatchmakingQueue } from '../../types';

export interface AddToQueueParams {
  nullifier_hash: string;
  wallet_address: string;
  stake_amount: number;
  socket_id?: string;
}

export async function addToQueue(params: AddToQueueParams): Promise<MatchmakingQueue> {
  // Expires 5 minutes from now
  const result = await pool.query<MatchmakingQueue>(
    `INSERT INTO matchmaking_queue (
       id,
       nullifier_hash,
       wallet_address,
       stake_amount,
       socket_id,
       status,
       created_at,
       expires_at
     ) VALUES (gen_random_uuid(), $1, $2, $3, $4, 'waiting', NOW(), NOW() + INTERVAL '5 minutes')
     ON CONFLICT (nullifier_hash)
     DO UPDATE SET
       wallet_address = EXCLUDED.wallet_address,
       stake_amount   = EXCLUDED.stake_amount,
       socket_id      = EXCLUDED.socket_id,
       status         = 'waiting',
       created_at     = NOW(),
       expires_at     = NOW() + INTERVAL '5 minutes'
     RETURNING *`,
    [
      params.nullifier_hash,
      params.wallet_address,
      params.stake_amount,
      params.socket_id ?? null,
    ]
  );
  return result.rows[0];
}

export async function getQueueEntry(
  nullifier_hash: string
): Promise<MatchmakingQueue | null> {
  const result = await pool.query<MatchmakingQueue>(
    `SELECT * FROM matchmaking_queue WHERE nullifier_hash = $1`,
    [nullifier_hash]
  );
  return result.rows[0] ?? null;
}

export async function removeFromQueue(nullifier_hash: string): Promise<void> {
  await pool.query(
    `DELETE FROM matchmaking_queue WHERE nullifier_hash = $1`,
    [nullifier_hash]
  );
}

export async function getWaitingPairs(
  stakeAmount: number
): Promise<MatchmakingQueue[]> {
  const result = await pool.query<MatchmakingQueue>(
    `SELECT * FROM matchmaking_queue
     WHERE stake_amount = $1
       AND status = 'waiting'
       AND expires_at > NOW()
     ORDER BY created_at ASC
     LIMIT 2`,
    [stakeAmount]
  );
  return result.rows;
}

export async function markMatched(id: string): Promise<void> {
  await pool.query(
    `UPDATE matchmaking_queue SET status = 'matched' WHERE id = $1`,
    [id]
  );
}

export async function cleanExpiredEntries(): Promise<void> {
  await pool.query(
    `DELETE FROM matchmaking_queue WHERE expires_at <= NOW() OR status = 'matched'`
  );
}

export async function updateSocketId(
  nullifier_hash: string,
  socket_id: string
): Promise<void> {
  await pool.query(
    `UPDATE matchmaking_queue SET socket_id = $2 WHERE nullifier_hash = $1`,
    [nullifier_hash, socket_id]
  );
}
