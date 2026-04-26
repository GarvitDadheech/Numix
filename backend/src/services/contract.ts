import {
  createWalletClient,
  createPublicClient,
  http,
  defineChain,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// ─── World Chain definition ───────────────────────────────────────────────────
const worldchain = defineChain({
  id: 480,
  name: 'World Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.WORLD_CHAIN_RPC ?? 'https://worldchain-mainnet.g.alchemy.com/public',
      ],
    },
  },
});

// ─── NumixEscrow ABI (only the functions we need) ─────────────────────────────
const NUMIX_ESCROW_ABI = [
  {
    name: 'createGame',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'gameId',       type: 'bytes32' },
      { name: 'player1',      type: 'address' },
      { name: 'player2',      type: 'address' },
      { name: 'stakeAmount',  type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'resolveGame',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'gameId',  type: 'bytes32' },
      { name: 'winner',  type: 'address' },
    ],
    outputs: [],
  },
  {
    name: 'resolveGameTie',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'gameId', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'cancelGame',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'gameId', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'getGame',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'gameId', type: 'bytes32' },
    ],
    outputs: [
      { name: 'player1',     type: 'address' },
      { name: 'player2',     type: 'address' },
      { name: 'stakeAmount', type: 'uint256' },
      { name: 'resolved',    type: 'bool'    },
    ],
  },
] as const;

// ─── Helper: UUID string → bytes32 Hex ───────────────────────────────────────
function uuidToBytes32(uuid: string): Hex {
  // Strip hyphens, left-pad to 32 bytes
  const stripped = uuid.replace(/-/g, '');
  const padded   = stripped.padStart(64, '0');
  return `0x${padded}` as Hex;
}

// ─── Clients ─────────────────────────────────────────────────────────────────
function getClients() {
  const privateKey = process.env.RESOLVER_PRIVATE_KEY as Hex;
  if (!privateKey) throw new Error('RESOLVER_PRIVATE_KEY is not set');

  const account = privateKeyToAccount(privateKey);

  const walletClient = createWalletClient({
    account,
    chain: worldchain,
    transport: http(),
  });

  const publicClient = createPublicClient({
    chain: worldchain,
    transport: http(),
  });

  const contractAddress = process.env.ESCROW_CONTRACT_ADDRESS as `0x${string}`;
  if (!contractAddress) throw new Error('ESCROW_CONTRACT_ADDRESS is not set');

  return { walletClient, publicClient, account, contractAddress };
}

// ─── Exported contract functions ─────────────────────────────────────────────
export async function createGame(
  gameId: string,
  player1Wallet: string,
  player2Wallet: string,
  stakeAmount: number
): Promise<string> {
  const { walletClient, contractAddress, publicClient } = getClients();

  // Convert WLD to wei (18 decimals)
  const stakeWei = BigInt(Math.round(stakeAmount * 1e18));

  const txHash = await walletClient.writeContract({
    address: contractAddress,
    abi: NUMIX_ESCROW_ABI,
    functionName: 'createGame',
    args: [
      uuidToBytes32(gameId),
      player1Wallet as `0x${string}`,
      player2Wallet as `0x${string}`,
      stakeWei,
    ],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

export async function resolveGame(
  gameId: string,
  winnerWallet: string
): Promise<string> {
  const { walletClient, contractAddress, publicClient } = getClients();

  const txHash = await walletClient.writeContract({
    address: contractAddress,
    abi: NUMIX_ESCROW_ABI,
    functionName: 'resolveGame',
    args: [
      uuidToBytes32(gameId),
      winnerWallet as `0x${string}`,
    ],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

export async function resolveGameTie(gameId: string): Promise<string> {
  const { walletClient, contractAddress, publicClient } = getClients();

  const txHash = await walletClient.writeContract({
    address: contractAddress,
    abi: NUMIX_ESCROW_ABI,
    functionName: 'resolveGameTie',
    args: [uuidToBytes32(gameId)],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

export async function cancelGame(gameId: string): Promise<string> {
  const { walletClient, contractAddress, publicClient } = getClients();

  const txHash = await walletClient.writeContract({
    address: contractAddress,
    abi: NUMIX_ESCROW_ABI,
    functionName: 'cancelGame',
    args: [uuidToBytes32(gameId)],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}
