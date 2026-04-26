import { useState, useCallback } from 'react'
import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js'
import { generateVerifyNonce, verifyHuman } from '../lib/api'

interface UseVerifyHumanResult {
  verify: () => Promise<{ nullifier_hash: string; wallet_address: string } | null>
  isLoading: boolean
  error: string | null
}

export function useVerifyHuman(): UseVerifyHumanResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const verify = useCallback(async () => {
    if (!MiniKit.isInstalled()) {
      setError('MiniKit is not installed. Please open in World App.')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      // 1. Get nonce from backend
      const { nonce } = await generateVerifyNonce()

      // 2. Call MiniKit verify
      const { finalPayload } = await MiniKit.commandsAsync.verify({
        action: 'verify-numix-player',
        verification_level: VerificationLevel.Orb,
        signal: nonce,
      })

      if (finalPayload.status === 'error') {
        const errCode = (finalPayload as { error_code?: string }).error_code
        if (errCode === 'user_rejected') {
          setError('Verification cancelled.')
        } else {
          setError('Verification failed. Please try again.')
        }
        return null
      }

      // 3. Verify with backend
      const result = await verifyHuman(finalPayload, nonce)

      if (!result.success) {
        setError('Backend verification failed.')
        return null
      }

      // 4. Store in sessionStorage
      sessionStorage.setItem('nullifier_hash', result.nullifier_hash)
      sessionStorage.setItem('wallet_address', result.wallet_address)

      return {
        nullifier_hash: result.nullifier_hash,
        wallet_address: result.wallet_address,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { verify, isLoading, error }
}
