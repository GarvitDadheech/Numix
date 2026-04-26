import pool from '../pool';
import { User } from '../../types';

export async function getUserByNullifier(nullifier_hash: string): Promise<User | null> {
  const result = await pool.query<User>(
    `SELECT
       id,
       nullifier_hash,
       wallet_address,
       elo_rating,
       games_played,
       games_won,
       total_wld_earned,
       notification_permission,
       created_at,
       updated_at
     FROM users
     WHERE nullifier_hash = $1`,
    [nullifier_hash]
  );
  return result.rows[0] ?? null;
}

export async function upsertUser(
  nullifier_hash: string,
  wallet_address: string
): Promise<User> {
  const result = await pool.query<User>(
    `INSERT INTO users (id, nullifier_hash, wallet_address, elo_rating, games_played, games_won, total_wld_earned, notification_permission, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, 1000, 0, 0, 0, false, NOW(), NOW())
     ON CONFLICT (nullifier_hash)
     DO UPDATE SET
       wallet_address = EXCLUDED.wallet_address,
       updated_at = NOW()
     RETURNING
       id,
       nullifier_hash,
       wallet_address,
       elo_rating,
       games_played,
       games_won,
       total_wld_earned,
       notification_permission,
       created_at,
       updated_at`,
    [nullifier_hash, wallet_address]
  );
  return result.rows[0];
}

export async function updateUserStats(
  nullifier_hash: string,
  won: boolean,
  wldEarned: number
): Promise<void> {
  await pool.query(
    `UPDATE users
     SET
       games_played = games_played + 1,
       games_won    = games_won + $2,
       total_wld_earned = total_wld_earned + $3,
       updated_at   = NOW()
     WHERE nullifier_hash = $1`,
    [nullifier_hash, won ? 1 : 0, wldEarned]
  );
}

export async function updateElo(
  nullifier_hash: string,
  delta: number
): Promise<void> {
  // Cap: max 2500, floor: 100
  await pool.query(
    `UPDATE users
     SET
       elo_rating = GREATEST(100, LEAST(2500, elo_rating + $2)),
       updated_at = NOW()
     WHERE nullifier_hash = $1`,
    [nullifier_hash, delta]
  );
}
