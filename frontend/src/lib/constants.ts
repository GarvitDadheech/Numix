import type { StakeAmount } from '../types'

export const ESCROW_CONTRACT_ADDRESS = import.meta.env.VITE_ESCROW_CONTRACT_ADDRESS as `0x${string}`
export const WLD_TOKEN_ADDRESS = import.meta.env.VITE_WLD_TOKEN_ADDRESS as `0x${string}`
export const WORLD_CHAIN_ID = 480
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string
export const STAKE_OPTIONS: StakeAmount[] = [0.5, 1, 2]
export const APP_ID = import.meta.env.VITE_APP_ID as string
