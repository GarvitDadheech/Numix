# numix — frontend

A Vite + React 18 single-page app that runs exclusively inside World App's WebView. It is mobile-first with a fixed max width of 430px and a dark theme throughout.

## World App constraints

These are not optional — ignoring them will break the app inside World App.

- **No `localStorage`**: World App's WebView sandboxes `localStorage` in a way that makes it unreliable. Use `sessionStorage` instead.
- **Always check `MiniKit.isInstalled()`** before calling any MiniKit method. Outside of World App (e.g. a regular browser during development), MiniKit is not available.
- **`MiniKit.install()` must run before React renders.** It is called at the top of `src/main.tsx` before `ReactDOM.createRoot`. Do not move it.
- **No `<input type="number">`.** Number inputs behave inconsistently in WebView. The game uses a custom numpad component for all numeric answer input.

## Screen flow

```
Splash -> Verify -> Home -> Lobby -> Game -> Result
                                              |
                                         Leaderboard (optional, from Result)
```

| Screen | What it does |
|---|---|
| `SplashScreen` | Brief loading screen, checks if already verified and redirects accordingly. |
| `VerifyScreen` | Calls World ID `verifyAction` via MiniKit to confirm the player is a real human. |
| `HomeScreen` | Shows the player's stats (ELO, wins/losses) and the stake selector to enter matchmaking. |
| `LobbyScreen` | Waiting room — polls the matchmaking queue and waits for `game_started` via socket. |
| `GameScreen` | Displays the current question, a 15-second timer, and the custom numpad. Receives all game events from the server. |
| `ResultScreen` | Shows the final scores, payout transaction hash, and options to rematch or return home. Disconnects the socket on unmount. |
| `LeaderboardScreen` | Fetches and displays the global ELO leaderboard. |

## Folder structure

```
src/
├── main.tsx             Entry point — installs MiniKit then mounts React
├── App.tsx              Route definitions (HashRouter with 7 routes)
├── index.css            Global styles and Tailwind base
├── screens/             One file per screen (see screen flow above)
├── components/
│   ├── EloDisplay.tsx       Shows current ELO rating
│   ├── LoadingSpinner.tsx    Reusable spinner
│   ├── PlayerAvatar.tsx      Avatar derived from nullifier hash
│   ├── QuestionCard.tsx      Displays a question and the countdown timer
│   ├── StakeSelector.tsx     Buttons for picking 0.5 / 1 / 2 WLD stake
│   └── WorldIDButton.tsx     Triggers MiniKit.verifyAction flow
├── hooks/
│   ├── useMiniKit.ts              Exposes isInstalled flag and the raw MiniKit instance
│   ├── useVerifyHuman.ts          Runs the World ID verification flow end-to-end
│   ├── useStake.ts                Handles MiniKit.pay() and calls /api/payment/confirm-stake
│   ├── useMatchmaking.ts          Polls /api/matchmaking/status, connects socket on match
│   ├── useGame.ts                 Manages in-game socket events and answer submission
│   └── useNotificationPermission.ts  Requests push notification permission via MiniKit
├── lib/
│   ├── api.ts           Typed fetch wrappers for all backend REST endpoints
│   ├── constants.ts     App-wide constants (stake options, question time limit, etc.)
│   ├── minikit.ts       installMiniKit() helper called in main.tsx
│   └── socket.ts        Socket.io client factory — creates/returns a single instance
├── store/
│   └── gameStore.ts     Zustand store — holds session state (nullifier, game ID, scores)
└── types/
    └── index.ts         Shared TypeScript types matching the backend payload shapes
```

## Key hooks

| Hook | What it does |
|---|---|
| `useMiniKit` | Checks `MiniKit.isInstalled()` and provides access to the MiniKit instance. |
| `useVerifyHuman` | Fetches a nonce, calls `MiniKit.verifyAction("verify-numix-player")`, posts the proof to `/api/auth/verify-human`. |
| `useStake` | Generates a payment nonce, calls `MiniKit.pay()` targeting the escrow contract, then confirms the transaction with the backend. |
| `useMatchmaking` | Polls `/api/matchmaking/status` until matched, then opens the socket connection and navigates to `GameScreen`. |
| `useGame` | Listens for `round_start`, `round_result`, and `game_over` socket events and keeps the in-game UI in sync. |

## Real-time

The Socket.io connection is opened only when a game is found (inside `useMatchmaking`). It is not connected at app startup. On `ResultScreen` unmount the socket is disconnected. All game state — round questions, answers, scores, and the final result — arrives from socket events. The frontend never polls during an active game.

## Environment variables

| Variable | Description |
|---|---|
| `VITE_APP_ID` | Your World Developer Portal app ID. Passed to MiniKit. |
| `VITE_BACKEND_URL` | Full URL of the backend (e.g. `http://localhost:3001` locally). |
| `VITE_ESCROW_CONTRACT_ADDRESS` | Deployed `NumixEscrow` address — used when constructing the MiniKit pay payload. |
| `VITE_WLD_TOKEN_ADDRESS` | WLD token address on World Chain (`0x163f8C2467924be0ae7B5347228CABF260318753`). |
| `VITE_WORLD_CHAIN_ID` | Chain ID for World Chain mainnet. Should be `480`. |
| `VITE_SUPABASE_URL` | Supabase project URL (only if the frontend makes direct Supabase calls). |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (only if the frontend makes direct Supabase calls). |

## Running locally

```bash
cp .env.example .env
# Set VITE_APP_ID to your Developer Portal app ID
# Set VITE_BACKEND_URL to wherever your backend is running
npm install
npm run dev
```

The app starts at `http://localhost:5173`.

To build for production:

```bash
npm run build    # outputs to dist/
npm run preview  # serves the built output locally
```

## Testing inside World App

World App requires HTTPS. Use [ngrok](https://ngrok.com) to expose your local dev server:

```bash
ngrok http 5173
```

Copy the `https://` URL that ngrok prints and paste it into the World Developer Portal as your app's URL. Then open World App on your phone, go to developer mode, scan the QR code, and the app will load in the WebView with MiniKit available.

You will need to do the same for the backend if you want full end-to-end testing on device: run `ngrok http 3001` and set `VITE_BACKEND_URL` to that HTTPS URL.
