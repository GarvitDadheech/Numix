# numix

Numix is a 1v1 real-time math duel mini-app that runs inside World App. Two verified humans stake WLD tokens, race through 5 math questions simultaneously, and the smart contract pays the winner automatically — no middleman holds the funds.

## How it works

1. Open the app inside World App and verify your identity with World ID.
2. Pick a stake amount (0.5, 1, or 2 WLD) and pay via MiniKit.
3. The backend matches you with another player at the same stake tier.
4. Both players receive the same 5 questions at the same time. You have 15 seconds per question.
5. For each round: correct answer wins the point; if both are correct, the faster answer wins.
6. After round 5, the smart contract automatically sends 90% of the pot to the winner (10% platform fee). On a tie, both players are refunded in full.

## Repository structure

```
numix/
├── frontend/    Vite + React SPA — the UI that runs inside World App's WebView
├── backend/     Node.js + Express server — auth, matchmaking, game logic, real-time events
└── contracts/   Solidity escrow contract — holds WLD stakes and pays out results
```

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | Vite 5, React 18, TypeScript, TailwindCSS, Socket.io client |
| Backend | Node.js 20, Express 4, TypeScript, PostgreSQL (raw queries via `pg`), Socket.io |
| Contracts | Solidity 0.8.20, Hardhat, OpenZeppelin, World Chain mainnet (chain ID 480) |

## Prerequisites

- Node.js 20 or later (and pnpm or npm)
- A [Supabase](https://supabase.com) project — used as the PostgreSQL database
- A [World Developer Portal](https://developer.worldcoin.org) app with the settings described below
- A wallet funded with ETH (for gas) on World Chain to act as the resolver

## Quick start

**1. Backend**

```bash
cd backend
cp .env.example .env
# Fill in all variables — see backend/README.md
npm install
npm run dev
```

**2. Frontend**

```bash
cd frontend
cp .env.example .env
# Fill in VITE_APP_ID and VITE_BACKEND_URL at minimum
npm install
npm run dev
```

**3. Contracts**

```bash
cd contracts
cp .env.example .env
# Fill in RESOLVER_PRIVATE_KEY and WORLD_CHAIN_RPC
npm install
npm run compile
npm run deploy:worldchain
```

See each sub-folder's README for full configuration details.

## Environment files

| File | What it configures |
|---|---|
| `backend/.env` | Database, World ID app credentials, escrow contract address, resolver wallet key |
| `frontend/.env` | App ID, backend URL, escrow contract address, Supabase connection |
| `contracts/.env` | Resolver private key and RPC URL for deployment |

Copy from the `.env.example` in each folder.

## World Developer Portal checklist

Before the app will work end-to-end, make sure the following are configured in your app's Developer Portal settings:

- **Incognito Actions** — create an action with the name `verify-numix-player`
- **Tokens** — add WLD to the allowlisted payment tokens
- **Permissions → Contract Entrypoints** — add the deployed `NumixEscrow` contract address
- **Permissions → Payment Recipients** — add the same contract address
- **Push Notifications** — enable push notifications for the app
