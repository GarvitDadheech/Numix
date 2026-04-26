import { Router, Request, Response } from 'express';
import { Server } from 'socket.io';
import { requireAuth } from '../middleware/auth';
import {
  getGame,
  getRound,
  updateRoundAnswer,
  getGameHistory,
} from '../db/queries/games';
import pool from '../db/pool';
import { evaluateRound } from '../services/gameEngine';

// Factory so we can inject the Socket.io server instance
export function createGameRouter(io: Server): Router {
  const router = Router();

  // POST /api/game/:gameId/submit-answer  (requires auth)
  router.post('/:gameId/submit-answer', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const { gameId } = req.params;
    const { round_number, answer, time_ms } = req.body as {
      round_number: number;
      answer:       number;
      time_ms:      number;
    };

    if (round_number === undefined || answer === undefined || time_ms === undefined) {
      res.status(400).json({ error: 'Missing required fields: round_number, answer, time_ms' });
      return;
    }

    const nullifierHash = req.user!.nullifier_hash;

    try {
      const game = await getGame(gameId);

      if (!game) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }

      if (game.status !== 'active') {
        res.status(400).json({ error: `Game is not active (status: ${game.status})` });
        return;
      }

      // Determine player number
      let playerNum: 1 | 2;
      if (game.player1_nullifier === nullifierHash) {
        playerNum = 1;
      } else if (game.player2_nullifier === nullifierHash) {
        playerNum = 2;
      } else {
        res.status(403).json({ error: 'You are not a participant in this game' });
        return;
      }

      // Check if already answered
      const existingRound = await getRound(gameId, round_number);
      if (!existingRound) {
        res.status(404).json({ error: 'Round not found' });
        return;
      }

      const alreadyAnswered =
        playerNum === 1
          ? existingRound.player1_answer !== null
          : existingRound.player2_answer !== null;

      if (alreadyAnswered) {
        res.status(409).json({ error: 'You have already answered this round' });
        return;
      }

      // Record answer
      await updateRoundAnswer(gameId, round_number, playerNum, answer, time_ms);

      // Check if both players have answered
      const updatedRound = await getRound(gameId, round_number);
      if (
        updatedRound &&
        updatedRound.player1_answer !== null &&
        updatedRound.player2_answer !== null
      ) {
        // Both answered — evaluate immediately
        setImmediate(() => {
          evaluateRound(gameId, round_number, io).catch((err) =>
            console.error(`[game] evaluateRound error game=${gameId} round=${round_number}:`, err)
          );
        });
      }

      res.json({ success: true, message: 'Answer recorded' });
    } catch (err) {
      console.error('[game] submit-answer error:', err);
      res.status(500).json({ error: 'Failed to record answer' });
    }
  });

  // GET /api/game/history  (requires auth)  — must be before /:gameId
  router.get('/history', requireAuth, async (req: Request, res: Response): Promise<void> => {
    const nullifierHash = req.user!.nullifier_hash;

    try {
      const games = await getGameHistory(nullifierHash, 10);
      res.json({ games });
    } catch (err) {
      console.error('[game] history error:', err);
      res.status(500).json({ error: 'Failed to fetch game history' });
    }
  });

  // GET /api/game/:gameId  — return game state + rounds
  router.get('/:gameId', async (req: Request, res: Response): Promise<void> => {
    const { gameId } = req.params;

    try {
      const game = await getGame(gameId);

      if (!game) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }

      const roundsResult = await pool.query(
        `SELECT * FROM game_rounds WHERE game_id = $1 ORDER BY round_number ASC`,
        [gameId]
      );

      res.json({ game, rounds: roundsResult.rows });
    } catch (err) {
      console.error('[game] get game error:', err);
      res.status(500).json({ error: 'Failed to fetch game' });
    }
  });

  return router;
}
