import { Request, Response, NextFunction } from 'express';
import { getUserByNullifier } from '../db/queries/users';

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const nullifierHash = req.headers['x-nullifier-hash'] as string | undefined;

  if (!nullifierHash) {
    res.status(401).json({ error: 'Missing x-nullifier-hash header' });
    return;
  }

  try {
    const user = await getUserByNullifier(nullifierHash);

    if (!user) {
      res.status(401).json({ error: 'User not found. Please verify with World ID first.' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[auth] requireAuth error:', err);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
}
