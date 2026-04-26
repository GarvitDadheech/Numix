import { verifyCloudProof, ISuccessResult } from '@worldcoin/minikit-js';

export async function verifyHuman(
  payload: ISuccessResult,
  action: string,
  nonce: string
) {
  const result = await verifyCloudProof(
    payload,
    process.env.APP_ID! as `app_${string}`,
    action,
    nonce
  );
  return result;
}
