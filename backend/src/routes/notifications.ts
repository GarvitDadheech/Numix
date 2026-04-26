import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import pool from '../db/pool';

const router = Router();

// POST /api/notifications/request-permission  (requires auth)
router.post('/request-permission', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const nullifierHash = req.user!.nullifier_hash;

    await pool.query(
      `UPDATE users SET notification_permission = true, updated_at = NOW() WHERE nullifier_hash = $1`,
      [nullifierHash]
    );

    res.json({ success: true, message: 'Notification permission granted' });
  } catch (err) {
    console.error('[notifications] request-permission error:', err);
    res.status(500).json({ error: 'Failed to update notification permission' });
  }
});

export default router;
