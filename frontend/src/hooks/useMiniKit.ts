import { MiniKit } from '@worldcoin/minikit-js'

export function useMiniKit() {
  const isInstalled = MiniKit.isInstalled()
  // walletAddress is available after World ID verification and stored in sessionStorage
  const walletAddress = sessionStorage.getItem('wallet_address') ?? undefined
  return { isInstalled, walletAddress }
}
