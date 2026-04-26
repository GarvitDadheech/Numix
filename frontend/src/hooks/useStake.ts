import { useState, useCallback } from 'react'
import { MiniKit, Tokens, tokenToDecimals } from '@worldcoin/minikit-js'
import { generatePaymentNonce, confirmStake } from '../lib/api'
import { ESCROW_CONTRACT_ADDRESS } from '../lib/constants'
import type { StakeAmount } from '../types'

interface UseStakeResult {
  stake: (stakeAmount: StakeAmount, nullifierHash: string) => Promise<{ queue_id: string } | null>
  isLoading: boolean
  error: string | null
}

export function useStake(): UseStakeResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stake = useCallback(async (stakeAmount: StakeAmount, nullifierHash: string) => {
    if (!MiniKit.isInstalled()) {
      setError('MiniKit is not installed. Please open in World App.')
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      // 1. Generate payment nonce from backend
      const { id } = await generatePaymentNonce(nullifierHash)

      // 2. Call MiniKit pay
      const { finalPayload } = await MiniKit.commandsAsync.pay({
        reference: id,
        to: ESCROW_CONTRACT_ADDRESS,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(stakeAmount, Tokens.WLD).toString(),
          },
        ],
        description: 'Numix game stake',
      })

      if (finalPayload.status !== 'success') {
        setError('Payment cancelled or failed. Please try again.')
        return null
      }

      // 3. Confirm stake with backend
      const result = await confirmStake(
        {
          reference: id,
          transaction_id: (finalPayload as { transaction_id?: string }).transaction_id,
          status: finalPayload.status,
        },
        nullifierHash
      )

      if (!result.success) {
        setError('Failed to confirm stake.')
        return null
      }

      return { queue_id: result.queue_id }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { stake, isLoading, error }
}
