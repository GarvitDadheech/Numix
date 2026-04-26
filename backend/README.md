# numix — backend

The Express server that runs everything: identity verification, payment confirmation, matchmaking, game logic, and real-time events over Socket.io. The frontend never talks to the blockchain or the database directly — it only ever receives REST responses and socket events from this server.

## Folder structure

```
src/
├── index.ts                     Entry point — sets up Express, Socket.io, and starts the matchmaker
├── types/
│   └── index.ts                 Shared TypeScript types (StakeAmount, socket payloads, etc.)
├── middleware/
│   ├── auth.ts                  requireAuth — reads x-nullifier-hash header, looks up the user
│   └── rateLimit.ts             Rate limiters (general + stricter limit for auth routes)
├── db/
│   ├── pool.ts                  Singleton pg Pool configured from DATABASE_URL
│   ├── migrations/
│   │   └── 001_initial.sql      Full schema — run this in Supabase SQL editor to set up the DB
│   └── queries/
│       ├── games.ts             CRUD for games and game_rounds tables
│       ├── matchmaking.ts       Queue management (add, match, expire, status)
│       ├── leaderboard.ts       Ranked user query ordered by ELO
│       └── users.ts             Upsert/get users, update ELO and win/loss stats
├── routes/
│   ├── auth.ts                  World ID nonce generation and proof verification
│   ├── payment.ts               Payment nonce generation and stake confirmation via Dev Portal API
│   ├── matchmaking.ts           Queue status polling and queue leave
│   ├── game.ts                  Answer submission and game/history fetch
│   ├── leaderboard.ts           Public leaderboard endpoint
│   └── notifications.ts         Store notification permission flag against the user
└── services/
    ├── matchmaker.ts            Polling loop — pairs players, creates DB records, emits game_started
    ├── gameEngine.ts            Evaluates round results, emits round events, calls contract on finish
    ├── contract.ts              viem client — wraps createGame / resolveGame / resolveGameTie calls
    ├── worldId.ts               Calls World ID cloud API to verify a proof
    └── notifications.ts         Sends push notifications via World Developer Portal API
```

## API endpoints

| Method | Path | Auth required | Description |
|---|---|---|---|
| GET | `/health` | No | Returns `{ status: "ok" }` — useful for uptime checks |
| POST | `/api/auth/generate-verify-nonce` | No | Creates a one-time nonce for World ID verification |
| POST | `/api/auth/verify-human` | No | Verifies a World ID proof and upserts the user record |
| POST | `/api/payment/generate-nonce` | Yes | Creates a one-time payment reference UUID |
| POST | `/api/payment/confirm-stake` | Yes | Verifies the MiniKit transaction with Dev Portal, then adds the player to the matchmaking queue |
| GET | `/api/matchmaking/status` | No | Polls queue status for a given `nullifier_hash` |
| DELETE | `/api/matchmaking/leave` | Yes | Removes the player from the queue (only if not yet matched) |
| POST | `/api/game/:gameId/submit-answer` | Yes | Records an answer for the current round (REST alternative to the socket event) |
| GET | `/api/game/history` | Yes | Returns the last 10 completed games for the authenticated player |
| GET | `/api/game/:gameId` | No | Returns full game state and all round records |
| GET | `/api/leaderboard` | No | Returns ranked players ordered by ELO (`?limit=50`, max 100) |
| POST | `/api/notifications/request-permission` | Yes | Marks the player as having granted notification permission |

Auth is handled by the `requireAuth` middleware. Authenticated requests must include an `x-nullifier-hash` header whose value matches a verified user in the database.

## Socket.io events

Socket.io is served at the `/socket` path.

### Client to server

| Event | Payload | Description |
|---|---|---|
| `join_game` | `{ game_id, nullifier_hash }` | Joins the socket room for a game. Must be sent after `game_started` is received. |
| `answer_submitted` | `{ game_id, round, answer, time_ms, nullifier_hash }` | Submit an answer for the current round. Equivalent to the REST endpoint. |
| `request_rematch` | `{ game_id, nullifier_hash }` | Broadcasts a rematch request to the other player in the game room. |
| `chat_message` | `{ game_id, message, nullifier_hash }` | Broadcasts a sanitized chat message (max 200 characters) to the game room. |

### Server to client

| Event | Payload | Description |
|---|---|---|
| `game_started` | `{ game_id, opponent_nullifier, opponent_wallet, stake_amount, player_number, starts_at }` | Sent to each player individually when a match is found. |
| `round_start` | `{ game_id, round_number, question_text, difficulty, time_limit_ms }` | Sent to the game room at the start of each round (15 second time limit). |
| `round_result` | `{ game_id, round_number, correct_answer, player1_answer, player1_time_ms, player2_answer, player2_time_ms, round_winner, player1_score, player2_score }` | Sent to the game room once both players have answered (or timed out). |
| `game_over` | `{ game_id, is_tie, winner_nullifier, winner_wallet, player1_score, player2_score, stake_amount, payout_tx_hash }` | Sent to the game room after round 5 is resolved and the contract payout is confirmed. |
| `rematch_requested` | `{ game_id, requested_by }` | Forwarded to the game room when one player sends `request_rematch`. |
| `chat_message` | `{ game_id, message, nullifier_hash, timestamp }` | Forwarded to the game room from any player's `chat_message` event. |

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Port to listen on. Defaults to `3001`. |
| `NODE_ENV` | No | Set to `production` in live deployments. |
| `APP_ID` | Yes | Your World Developer Portal app ID (e.g. `app_xxxxxxxxxx`). |
| `DEV_PORTAL_API_KEY` | Yes | API key from the Developer Portal — used to verify payment transactions. |
| `DATABASE_URL` | Yes | PostgreSQL connection string (e.g. from Supabase → Settings → Database → Connection string). |
| `ESCROW_CONTRACT_ADDRESS` | Yes | Deployed `NumixEscrow` contract address on World Chain. |
| `WLD_TOKEN_ADDRESS` | Yes | WLD token address on World Chain (`0x163f8C2467924be0ae7B5347228CABF260318753`). |
| `RESOLVER_PRIVATE_KEY` | Yes | Private key of the hot wallet that calls `createGame` / `resolveGame` on-chain. Keep this secret. |
| `WORLD_CHAIN_RPC` | Yes | RPC endpoint for World Chain mainnet. |
| `FRONTEND_URL` | Yes | The frontend origin — used for CORS and Socket.io origin allow-list. |

## Running locally

```bash
cp .env.example .env
# Edit .env and fill in all required values
npm install
npm run dev
```

The server starts on `http://localhost:3001` by default. `ts-node-dev` watches for file changes and restarts automatically.

To build for production:

```bash
npm run build   # outputs to dist/
npm start       # runs dist/index.js
```

## Database setup

The full schema lives in `src/db/migrations/001_initial.sql`. Run it once in your Supabase project's SQL editor before starting the server. It creates the `users`, `games`, `game_rounds`, `matchmaking_queue`, `payment_nonces`, and `questions` tables.

## How matchmaking works

A `setInterval` loop runs every 2 seconds. On each tick it:

1. Queries the `matchmaking_queue` table for pairs of waiting players at each stake tier (0.5, 1, 2 WLD).
2. If a pair is found, creates a `games` record and five `game_rounds` records (2 easy + 2 medium + 1 hard questions, drawn randomly from the `questions` table).
3. Marks both queue entries as `matched` so they cannot be re-paired.
4. Calls `createGame()` on the escrow contract (non-blocking — a contract failure is logged but does not abort the game).
5. Emits `game_started` to each player's socket individually, then emits `round_start` for round 1 after a 2-second countdown.

If the `questions` table is empty, five arithmetic fallback questions are generated in memory.

## How game resolution works

When both players have submitted answers for a round, `evaluateRound` is called:

- If both are correct, the faster answer wins the round point.
- If only one is correct, that player wins the round.
- If neither is correct, the round is a tie (no point awarded).

After round 5 is evaluated, `resolveGame` is called:

- If one player has more points, the contract's `resolveGame(gameId, winnerAddress)` is called. The winner receives 90% of the combined pot; 10% goes to the contract owner as a platform fee.
- If scores are equal, `resolveGameTie(gameId)` is called. Both players receive their original stake back.

ELO is updated immediately after resolution: +25 for a win, -15 for a loss, and no change on a tie.
