import { MiniKit } from '@worldcoin/minikit-js'

export function installMiniKit() {
  MiniKit.install(import.meta.env.VITE_APP_ID as string)
}
