import { Router, Request, Response } from 'express';
import { getLeaderboard } from '../db/queries/leaderboard';

const router = Router();

// GET /api/leaderboard?limit=50
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(Math.max(parseInt((req.query.limit as string) ?? '50', 10) || 50, 1), 100);

  try {
    const entries = await getLeaderboard(limit);
    res.json({ leaderboard: entries, total: entries.length });
  } catch (err) {
    console.error('[leaderboard] fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export default router;
