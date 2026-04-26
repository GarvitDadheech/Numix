import pool from '../pool';

export interface LeaderboardEntry {
  rank: number;
  nullifier_hash: string;
  wallet_address: string;
  elo_rating: number;
  games_played: number;
  games_won: number;
  win_rate: number;
  total_wld_earned: number;
}

export async function getLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
  const result = await pool.query<LeaderboardEntry>(
    `SELECT
       ROW_NUMBER() OVER (ORDER BY elo_rating DESC, games_won DESC) AS rank,
       nullifier_hash,
       wallet_address,
       elo_rating,
       games_played,
       games_won,
       CASE
         WHEN games_played = 0 THEN 0
         ELSE ROUND((games_won::numeric / games_played) * 100, 1)
       END AS win_rate,
       total_wld_earned
     FROM users
     WHERE games_played > 0
     ORDER BY elo_rating DESC, games_won DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}
