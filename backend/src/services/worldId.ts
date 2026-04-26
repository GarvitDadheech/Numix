import { ISuccessResult } from '@worldcoin/minikit-js';
import { hashToField } from '@worldcoin/idkit-core/hashing';

export async function verifyHuman(
  payload: ISuccessResult,
  action: string,
  signal: string
) {
  const body = {
    protocol_version: '3.0',
    nonce: signal,
    action,
    responses: [
      {
        identifier: payload.verification_level,
        merkle_root: payload.merkle_root,
        nullifier: payload.nullifier_hash,
        proof: payload.proof,
        signal_hash: (payload as any).signal_hash ?? hashToField(signal).digest,
      },
    ],
    environment: 'production',
  };

  const response = await fetch(
    `https://developer.worldcoin.org/api/v4/verify/${process.env.APP_ID}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (response.ok) {
    return { success: true };
  }

  const error = await response.json() as Record<string, unknown>;
  console.error('[worldId] v4 verification failed:', JSON.stringify(error, null, 2));
  return { success: false, ...error };
}
