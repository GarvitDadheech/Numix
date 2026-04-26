import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ISuccessResult } from '@worldcoin/minikit-js';
import { verifyHuman } from '../services/worldId';
import { upsertUser } from '../db/queries/users';
import pool from '../db/pool';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

// POST /api/auth/generate-verify-nonce
router.post('/generate-verify-nonce', authLimiter, async (_req: Request, res: Response): Promise<void> => {
  try {
    const nonce = uuidv4();

    await pool.query(
      `INSERT INTO payment_nonces (id, wallet_address, used, created_at)
       VALUES ($1, NULL, false, NOW())`,
      [nonce]
    );

    res.json({ nonce });
  } catch (err) {
    console.error('[auth] generate-verify-nonce error:', err);
    res.status(500).json({ error: 'Failed to generate nonce' });
  }
});

// POST /api/auth/verify-human
router.post('/verify-human', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const { payload, action, nonce, wallet_address } = req.body as {
    payload:        ISuccessResult;
    action:         string;
    nonce:          string;
    wallet_address?: string;
  };

  if (!payload || !action || !nonce) {
    res.status(400).json({ error: 'Missing required fields: payload, action, nonce' });
    return;
  }

  if (action !== 'verify-numix-player') {
    res.status(400).json({ error: 'Invalid action' });
    return;
  }

  try {
    // Check nonce exists and has not been used
    const nonceRow = await pool.query(
      `SELECT id, used FROM payment_nonces WHERE id = $1`,
      [nonce]
    );

    if (nonceRow.rows.length === 0) {
      res.status(400).json({ error: 'Invalid nonce' });
      return;
    }

    if (nonceRow.rows[0].used) {
      res.status(400).json({ error: 'Nonce already used' });
      return;
    }

    // Verify with World ID cloud
    const verifyResult = await verifyHuman(payload, action, nonce);

    if (!verifyResult.success) {
      res.status(400).json({ error: 'World ID verification failed', detail: verifyResult });
      return;
    }

    // Mark nonce as used
    await pool.query(`UPDATE payment_nonces SET used = true WHERE id = $1`, [nonce]);

    // Upsert user — wallet_address comes from MiniKit separately, not from the proof payload
    const walletAddress = wallet_address ?? '';
    const user = await upsertUser(payload.nullifier_hash, walletAddress);

    res.json({
      success:        true,
      nullifier_hash: user.nullifier_hash,
      wallet_address: user.wallet_address,
    });
  } catch (err) {
    console.error('[auth] verify-human error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

export default router;
