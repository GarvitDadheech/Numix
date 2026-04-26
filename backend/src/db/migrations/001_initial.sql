-- numix database schema
-- Run with: psql $DATABASE_URL -f src/db/migrations/001_initial.sql

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nullifier_hash          TEXT NOT NULL UNIQUE,
  wallet_address          TEXT NOT NULL,
  elo_rating              INTEGER NOT NULL DEFAULT 1000,
  games_played            INTEGER NOT NULL DEFAULT 0,
  games_won               INTEGER NOT NULL DEFAULT 0,
  total_wld_earned        NUMERIC(18, 6) NOT NULL DEFAULT 0,
  notification_permission BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_elo ON users (elo_rating DESC);

-- ─── questions ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text  TEXT NOT NULL,
  correct_answer INTEGER NOT NULL,
  difficulty     TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── games ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS games (
  id                  UUID PRIMARY KEY,
  player1_nullifier   TEXT NOT NULL REFERENCES users(nullifier_hash),
  player2_nullifier   TEXT NOT NULL REFERENCES users(nullifier_hash),
  player1_wallet      TEXT NOT NULL,
  player2_wallet      TEXT NOT NULL,
  stake_amount        NUMERIC(10, 4) NOT NULL,
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('waiting', 'active', 'finished', 'cancelled')),
  player1_score       INTEGER NOT NULL DEFAULT 0,
  player2_score       INTEGER NOT NULL DEFAULT 0,
  winner_nullifier    TEXT REFERENCES users(nullifier_hash),
  winner_wallet       TEXT,
  contract_game_id    TEXT,
  payout_tx_hash      TEXT,
  started_at          TIMESTAMPTZ,
  finished_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_games_player1 ON games (player1_nullifier);
CREATE INDEX IF NOT EXISTS idx_games_player2 ON games (player2_nullifier);
CREATE INDEX IF NOT EXISTS idx_games_status  ON games (status);

-- ─── game_rounds ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_rounds (
  id               UUID PRIMARY KEY,
  game_id          UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_number     INTEGER NOT NULL CHECK (round_number BETWEEN 1 AND 5),
  question_id      UUID NOT NULL,
  question_text    TEXT NOT NULL,
  correct_answer   INTEGER NOT NULL,
  difficulty       TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  player1_answer   INTEGER,
  player1_time_ms  INTEGER,
  player2_answer   INTEGER,
  player2_time_ms  INTEGER,
  round_winner     TEXT CHECK (round_winner IN ('player1', 'player2', 'tie')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (game_id, round_number)
);

CREATE INDEX IF NOT EXISTS idx_rounds_game ON game_rounds (game_id);

-- ─── matchmaking_queue ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nullifier_hash   TEXT NOT NULL UNIQUE REFERENCES users(nullifier_hash),
  wallet_address   TEXT NOT NULL,
  stake_amount     NUMERIC(10, 4) NOT NULL,
  socket_id        TEXT,
  status           TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes')
);

CREATE INDEX IF NOT EXISTS idx_queue_stake_status ON matchmaking_queue (stake_amount, status, created_at);

-- ─── payment_nonces ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_nonces (
  id              UUID PRIMARY KEY,
  wallet_address  TEXT,
  used            BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nonces_wallet ON payment_nonces (wallet_address);

-- ─── Seed questions ───────────────────────────────────────────────────────────
INSERT INTO questions (question_text, correct_answer, difficulty) VALUES
  -- Easy
  ('3 + 4 = ?', 7, 'easy'),
  ('10 - 6 = ?', 4, 'easy'),
  ('5 × 3 = ?', 15, 'easy'),
  ('18 ÷ 2 = ?', 9, 'easy'),
  ('7 + 8 = ?', 15, 'easy'),
  ('20 - 13 = ?', 7, 'easy'),
  ('6 × 4 = ?', 24, 'easy'),
  ('36 ÷ 6 = ?', 6, 'easy'),
  ('9 + 11 = ?', 20, 'easy'),
  ('25 - 17 = ?', 8, 'easy'),
  -- Medium
  ('12 × 7 = ?', 84, 'medium'),
  ('144 ÷ 12 = ?', 12, 'medium'),
  ('23 + 48 = ?', 71, 'medium'),
  ('100 - 37 = ?', 63, 'medium'),
  ('15 × 9 = ?', 135, 'medium'),
  ('72 ÷ 8 = ?', 9, 'medium'),
  ('56 + 79 = ?', 135, 'medium'),
  ('200 - 64 = ?', 136, 'medium'),
  ('11 × 13 = ?', 143, 'medium'),
  ('96 ÷ 4 = ?', 24, 'medium'),
  -- Hard
  ('17 × 19 = ?', 323, 'hard'),
  ('256 ÷ 16 = ?', 16, 'hard'),
  ('137 + 298 = ?', 435, 'hard'),
  ('1000 - 347 = ?', 653, 'hard'),
  ('23 × 24 = ?', 552, 'hard'),
  ('18² = ?', 324, 'hard'),
  ('7³ = ?', 343, 'hard'),
  ('√625 = ?', 25, 'hard'),
  ('31 × 29 = ?', 899, 'hard'),
  ('480 ÷ 15 = ?', 32, 'hard')
ON CONFLICT DO NOTHING;
