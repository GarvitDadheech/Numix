import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth';
import { addToQueue } from '../db/queries/matchmaking';
import pool from '../db/pool';
import { StakeAmount } from '../types';

const router = Router();

// POST /api/payment/generate-nonce  (requires auth)
router.post('/generate-nonce', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const walletAddress = req.user!.wallet_address;
    const id = uuidv4();

    await pool.query(
      `INSERT INTO payment_nonces (id, wallet_address, used, created_at)
       VALUES ($1, $2, false, NOW())`,
      [id, walletAddress]
    );

    res.json({ id });
  } catch (err) {
    console.error('[payment] generate-nonce error:', err);
    res.status(500).json({ error: 'Failed to generate payment nonce' });
  }
});

// POST /api/payment/confirm-stake  (requires auth)
router.post('/confirm-stake', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { transactionId, reference, stake_amount, wallet_address } = req.body as {
    transactionId:  string;
    reference:      string;
    stake_amount:   number;
    wallet_address: string;
  };

  if (!transactionId || !reference || stake_amount === undefined || !wallet_address) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const validStakes: StakeAmount[] = [0.5, 1, 2];
  if (!validStakes.includes(stake_amount as StakeAmount)) {
    res.status(400).json({ error: 'Invalid stake_amount. Must be 0.5, 1, or 2' });
    return;
  }

  try {
    // 1. Verify transaction via World Dev Portal API
    const verifyUrl = `https://developer.worldcoin.org/api/v2/minikit/transaction/${transactionId}?app_id=${process.env.APP_ID}&type=payment`;

    const txResponse = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.DEV_PORTAL_API_KEY}`,
      },
    });

    if (!txResponse.ok) {
      res.status(400).json({ error: 'Failed to verify transaction with World Dev Portal' });
      return;
    }

    const transaction = await txResponse.json() as {
      transactionStatus: string;
      inputToken:        string;
      inputTokenAmount:  string;
      reference:         string;
    };

    // 2. Check transaction status
    if (transaction.transactionStatus !== 'mined') {
      res.status(400).json({
        error: `Transaction not mined yet. Status: ${transaction.transactionStatus}`,
      });
      return;
    }

    // 3. Check token type
    if (transaction.inputToken?.toUpperCase() !== 'WLD') {
      res.status(400).json({ error: 'Payment must be in WLD token' });
      return;
    }

    // 4. Check amount (WLD has 18 decimals — compare in WLD units)
    const paidAmount = parseFloat(transaction.inputTokenAmount);
    if (paidAmount < stake_amount) {
      res.status(400).json({
        error: `Insufficient stake. Expected ${stake_amount} WLD, received ${paidAmount} WLD`,
      });
      return;
    }

    // 5. Verify nonce reference exists and is unused
    const nonceRow = await pool.query(
      `SELECT id, used, wallet_address FROM payment_nonces WHERE id = $1`,
      [reference]
    );

    if (nonceRow.rows.length === 0) {
      res.status(400).json({ error: 'Invalid payment reference' });
      return;
    }

    if (nonceRow.rows[0].used) {
      res.status(400).json({ error: 'Payment reference already used' });
      return;
    }

    // 6. Mark nonce as used
    await pool.query(`UPDATE payment_nonces SET used = true WHERE id = $1`, [reference]);

    // 7. Add to matchmaking queue
    const queueEntry = await addToQueue({
      nullifier_hash: req.user!.nullifier_hash,
      wallet_address: wallet_address,
      stake_amount:   stake_amount,
    });

    res.json({ success: true, queue_id: queueEntry.id });
  } catch (err) {
    console.error('[payment] confirm-stake error:', err);
    res.status(500).json({ error: 'Failed to confirm stake' });
  }
});

export default router;
