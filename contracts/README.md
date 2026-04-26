# numix — contracts

`NumixEscrow.sol` is the escrow contract for numix. It holds WLD stakes from both players and pays out the result automatically. It is deployed on World Chain mainnet (chain ID 480).

## How the payment flow works with MiniKit

1. **Players pay into the contract.** Each player calls `MiniKit.pay()` inside World App, which sends their WLD stake directly to the contract address. The contract receives the tokens passively — it does not pull funds.
2. **Backend registers the game.** Once the backend confirms both payments have arrived (via the World Developer Portal transaction API), the resolver wallet calls `createGame()` to lock the funds against a game ID.
3. **Backend resolves the result.** After all 5 rounds are evaluated, the resolver calls either `resolveGame(gameId, winnerAddress)` or `resolveGameTie(gameId)`. The contract sends tokens immediately.

The 10% platform fee is taken only on a winner-takes-all result. On a tie, both players receive their exact stake back with no fee.

## Contract functions

| Function | Who can call it | What it does |
|---|---|---|
| `createGame(gameId, player1, player2, stakeAmount)` | Resolver only | Registers a new game. Requires the contract already holds at least `stakeAmount * 2` WLD. Sets the game status to Active. |
| `resolveGame(gameId, winner)` | Resolver only | Pays 90% of the pot to the winner and 10% to the contract owner. Sets the game status to Finished. |
| `resolveGameTie(gameId)` | Resolver only | Refunds each player their original stake in full. Sets the game status to Finished. |
| `cancelGame(gameId)` | Resolver only | Refunds both players in full. Used for disconnects or timeouts before the game completes. Sets the game status to Cancelled. |
| `setResolver(address)` | Owner only | Updates the resolver address (e.g. if the backend hot wallet is rotated). |
| `withdrawStuck(token, amount)` | Owner only | Emergency withdrawal for tokens stranded in the contract after all games are settled. |
| `getGame(gameId)` | Anyone | Returns the `Game` struct (player addresses, stake amount, status). |

## Events

| Event | When emitted | Key fields |
|---|---|---|
| `GameCreated` | `createGame` succeeds | `gameId`, `player1`, `player2`, `stakeAmount` |
| `GameResolved` | `resolveGame` succeeds | `gameId`, `winner`, `winnerPayout`, `feePaid` |
| `GameTied` | `resolveGameTie` succeeds | `gameId`, `player1`, `player2`, `refundAmount` |
| `GameCancelled` | `cancelGame` succeeds | `gameId`, `player1`, `player2`, `refundAmount` |
| `ResolverUpdated` | `setResolver` succeeds | `oldResolver`, `newResolver` |

## Environment variables

| Variable | Description |
|---|---|
| `RESOLVER_PRIVATE_KEY` | Private key of the wallet that will be set as the resolver. This is the same wallet the backend uses. Keep it secret and funded with ETH for gas on World Chain. |
| `WORLD_CHAIN_RPC` | RPC endpoint for World Chain mainnet (e.g. `https://worldchain-mainnet.g.alchemy.com/public`). |

You may optionally set `RESOLVER_ADDRESS` to a different address than the deployer. If not set, the deploy script uses the deployer address as the resolver.

## Compile and deploy

```bash
npm install
npm run compile
npm run deploy:worldchain
```

The deploy script writes a `deployments/worldchain.json` file with the contract address, resolver, owner, and deployment timestamp.

After deploying, copy the contract address into two places:

1. `backend/.env` — set `ESCROW_CONTRACT_ADDRESS`
2. `frontend/.env` — set `VITE_ESCROW_CONTRACT_ADDRESS`

Then in the World Developer Portal, add the contract address to both:

- **Permissions → Contract Entrypoints**
- **Permissions → Payment Recipients**

Without those entries, `MiniKit.pay()` calls targeting the contract will be rejected by World App.

## Security notes

- Only the `resolver` address can call `createGame`, `resolveGame`, `resolveGameTie`, and `cancelGame`. Any other caller is rejected.
- All state-changing functions use OpenZeppelin's `ReentrancyGuard` to prevent re-entrancy attacks.
- All token transfers use OpenZeppelin's `SafeERC20` — failed transfers revert the transaction rather than returning false silently.
- The contract owner can change the resolver address via `setResolver` and can recover stuck tokens via `withdrawStuck`. The owner has no other privileged access.
- The WLD token address (`0x163f8C2467924be0ae7B5347228CABF260318753`) is hardcoded as an immutable constant. The contract only ever interacts with that specific token.
