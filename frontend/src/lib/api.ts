import { BACKEND_URL } from './constants'
import type { Game, LeaderboardEntry } from '../types'

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  nullifierHash?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (nullifierHash) {
    headers['x-nullifier-hash'] = nullifierHash
  }
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers,
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`API error ${res.status}: ${errText}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export async function generateVerifyNonce(): Promise<{ nonce: string }> {
  return apiFetch<{ nonce: string }>('/api/auth/nonce', { method: 'GET' })
}

export async function verifyHuman(
  payload: object,
  nonce: string
): Promise<{ success: boolean; nullifier_hash: string; wallet_address: string }> {
  return apiFetch('/api/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ payload, nonce }),
  })
}

export async function generatePaymentNonce(
  nullifierHash: string
): Promise<{ id: string }> {
  return apiFetch('/api/stake/nonce', { method: 'POST' }, nullifierHash)
}

export async function confirmStake(
  params: { reference: string; transaction_id?: string; status: string },
  nullifierHash: string
): Promise<{ success: boolean; queue_id: string }> {
  return apiFetch(
    '/api/stake/confirm',
    {
      method: 'POST',
      body: JSON.stringify(params),
    },
    nullifierHash
  )
}

export async function getMatchmakingStatus(
  nullifierHash: string
): Promise<{ status: string; game_id?: string }> {
  return apiFetch('/api/matchmaking/status', { method: 'GET' }, nullifierHash)
}

export async function leaveMatchmaking(nullifierHash: string): Promise<void> {
  return apiFetch('/api/matchmaking/leave', { method: 'POST' }, nullifierHash)
}

export async function submitAnswer(
  gameId: string,
  roundNumber: number,
  answer: number,
  timeMs: number,
  nullifierHash: string
): Promise<void> {
  return apiFetch(
    `/api/games/${gameId}/answer`,
    {
      method: 'POST',
      body: JSON.stringify({ round_number: roundNumber, answer, time_ms: timeMs }),
    },
    nullifierHash
  )
}

export async function getGame(gameId: string): Promise<Game> {
  return apiFetch<Game>(`/api/games/${gameId}`, { method: 'GET' })
}

export async function getGameHistory(nullifierHash: string): Promise<Game[]> {
  return apiFetch<Game[]>('/api/games/history', { method: 'GET' }, nullifierHash)
}

export async function getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  return apiFetch<LeaderboardEntry[]>(`/api/leaderboard?limit=${limit}`, { method: 'GET' })
}

export async function requestNotificationPermission(nullifierHash: string): Promise<void> {
  return apiFetch('/api/notifications/permission', { method: 'POST' }, nullifierHash)
}

export async function getUserProfile(
  nullifierHash: string
): Promise<{
  nullifier_hash: string
  wallet_address: string
  elo_rating: number
  games_played: number
  wins: number
  losses: number
  ties: number
  wld_earned: number
}> {
  return apiFetch('/api/users/me', { method: 'GET' }, nullifierHash)
}
