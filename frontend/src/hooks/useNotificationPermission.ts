import { useState, useCallback } from 'react'
import { requestNotificationPermission } from '../lib/api'

interface UseNotificationPermissionResult {
  requestPermission: (nullifierHash: string) => Promise<void>
  isLoading: boolean
  isGranted: boolean
  error: string | null
}

export function useNotificationPermission(): UseNotificationPermissionResult {
  const [isLoading, setIsLoading] = useState(false)
  const [isGranted, setIsGranted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestPermission = useCallback(async (nullifierHash: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await requestNotificationPermission(nullifierHash)
      setIsGranted(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to request permission'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { requestPermission, isLoading, isGranted, error }
}
