import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { getQueueEntry, removeFromQueue } from '../db/queries/matchmaking';
import pool from '../db/pool';

const router = Router();

// GET /api/matchmaking/status?nullifier_hash=xxx
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  const { nullifier_hash } = req.query as { nullifier_hash?: string };

  if (!nullifier_hash) {
    res.status(400).json({ error: 'Missing nullifier_hash query parameter' });
    return;
  }

  try {
    const entry = await getQueueEntry(nullifier_hash);

    if (!entry) {
      res.json({ status: 'not_queued' });
      return;
    }

    if (entry.status === 'matched') {
      // Find the active game for this player
      const gameResult = await pool.query(
        `SELECT id FROM games
         WHERE (player1_nullifier = $1 OR player2_nullifier = $1)
           AND status = 'active'
         ORDER BY created_at DESC
         LIMIT 1`,
        [nullifier_hash]
      );

      const gameId = gameResult.rows[0]?.id ?? null;
      res.json({ status: 'matched', game_id: gameId });
      return;
    }

    const now = new Date();
    const expiresAt = new Date(entry.expires_at);
    const waitingSeconds = Math.round((now.getTime() - new Date(entry.created_at).getTime()) / 1000);

    res.json({
      status:          'waiting',
      queue_id:        entry.id,
      stake_amount:    entry.stake_amount,
      waiting_seconds: waitingSeconds,
      expires_at:      entry.expires_at,
    });
  } catch (err) {
    console.error('[matchmaking] status error:', err);
    res.status(500).json({ error: 'Failed to get matchmaking status' });
  }
});

// DELETE /api/matchmaking/leave  (requires auth)
router.delete('/leave', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const nullifierHash = req.user!.nullifier_hash;
    const entry = await getQueueEntry(nullifierHash);

    if (!entry) {
      res.json({ success: true, message: 'Not in queue' });
      return;
    }

    if (entry.status === 'matched') {
      res.status(400).json({ error: 'Game already matched — cannot leave queue' });
      return;
    }

    await removeFromQueue(nullifierHash);
    res.json({ success: true, message: 'Removed from matchmaking queue' });
  } catch (err) {
    console.error('[matchmaking] leave error:', err);
    res.status(500).json({ error: 'Failed to leave matchmaking queue' });
  }
});

export default router;
