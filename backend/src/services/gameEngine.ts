import { Server } from 'socket.io';
import {
  getRound,
  updateRoundWinner,
  updateGame,
  getGame,
} from '../db/queries/games';
import { updateUserStats, updateElo } from '../db/queries/users';
import * as contractService from './contract';
import {
  RoundResultPayload,
  GameOverPayload,
  RoundStartPayload,
} from '../types';
import pool from '../db/pool';

// ─── Evaluate a round once both (or timed-out) answers are in ────────────────
export async function evaluateRound(
  gameId: string,
  roundNumber: number,
  io: Server
): Promise<void> {
  const round = await getRound(gameId, roundNumber);
  if (!round) {
    console.error(`[gameEngine] Round not found: game=${gameId} round=${roundNumber}`);
    return;
  }

  // If round already resolved skip
  if (round.round_winner !== null) return;

  // Determine winner
  const p1Correct = round.player1_answer === round.correct_answer;
  const p2Correct = round.player2_answer === round.correct_answer;

  let roundWinner: 'player1' | 'player2' | 'tie';

  if (p1Correct && p2Correct) {
    // Both correct → faster time wins
    const p1Time = round.player1_time_ms ?? Infinity;
    const p2Time = round.player2_time_ms ?? Infinity;
    if (p1Time < p2Time) {
      roundWinner = 'player1';
    } else if (p2Time < p1Time) {
      roundWinner = 'player2';
    } else {
      roundWinner = 'tie';
    }
  } else if (p1Correct) {
    roundWinner = 'player1';
  } else if (p2Correct) {
    roundWinner = 'player2';
  } else {
    roundWinner = 'tie';
  }

  // Persist round winner
  await updateRoundWinner(gameId, roundNumber, roundWinner);

  // Update scores
  const game = await getGame(gameId);
  if (!game) {
    console.error(`[gameEngine] Game not found: ${gameId}`);
    return;
  }

  let newP1Score = game.player1_score;
  let newP2Score = game.player2_score;
  if (roundWinner === 'player1') newP1Score++;
  if (roundWinner === 'player2') newP2Score++;

  await updateGame(gameId, {
    player1_score: newP1Score,
    player2_score: newP2Score,
  });

  // Emit round result to both players
  const resultPayload: RoundResultPayload = {
    game_id:        gameId,
    round_number:   roundNumber,
    correct_answer: round.correct_answer,
    player1_answer: round.player1_answer,
    player1_time_ms: round.player1_time_ms,
    player2_answer: round.player2_answer,
    player2_time_ms: round.player2_time_ms,
    round_winner:   roundWinner,
    player1_score:  newP1Score,
    player2_score:  newP2Score,
  };

  io.to(`game:${gameId}`).emit('round_result', resultPayload);

  // Advance or finish
  if (roundNumber < 5) {
    setTimeout(async () => {
      await emitRoundStart(gameId, roundNumber + 1, io);
    }, 2000);
  } else {
    // Small delay so clients render last round result first
    setTimeout(async () => {
      await resolveGame(gameId, io);
    }, 2000);
  }
}

// ─── Emit round_start for the given round number ──────────────────────────────
async function emitRoundStart(
  gameId: string,
  roundNumber: number,
  io: Server
): Promise<void> {
  const round = await getRound(gameId, roundNumber);
  if (!round) {
    console.error(`[gameEngine] Cannot find round ${roundNumber} for game ${gameId}`);
    return;
  }

  const payload: RoundStartPayload = {
    game_id:       gameId,
    round_number:  roundNumber,
    question_text: round.question_text,
    difficulty:    round.difficulty,
    time_limit_ms: 15000,
  };

  io.to(`game:${gameId}`).emit('round_start', payload);
}

// ─── Resolve the full game ────────────────────────────────────────────────────
export async function resolveGame(gameId: string, io: Server): Promise<void> {
  const game = await getGame(gameId);
  if (!game) {
    console.error(`[gameEngine] resolveGame: game not found ${gameId}`);
    return;
  }

  // Already finished guard
  if (game.status === 'finished' || game.status === 'cancelled') return;

  let payoutTxHash: string;
  let isTie = false;
  let winnerNullifier: string | null = null;
  let winnerWallet: string | null    = null;

  try {
    if (game.player1_score === game.player2_score) {
      isTie = true;
      payoutTxHash = await contractService.resolveGameTie(gameId);
    } else {
      const player1Won = game.player1_score > game.player2_score;
      winnerNullifier = player1Won ? game.player1_nullifier : game.player2_nullifier;
      winnerWallet    = player1Won ? game.player1_wallet    : game.player2_wallet;
      payoutTxHash    = await contractService.resolveGame(gameId, winnerWallet);
    }
  } catch (err) {
    console.error('[gameEngine] Contract resolveGame failed:', err);
    payoutTxHash = '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  // Update game record
  await updateGame(gameId, {
    status:          'finished',
    winner_nullifier: winnerNullifier ?? undefined,
    winner_wallet:    winnerWallet    ?? undefined,
    payout_tx_hash:   payoutTxHash,
    finished_at:      new Date(),
  });

  // WLD earned per player based on stake
  const stakeAmount = game.stake_amount as number;
  const winnerWld   = isTie ? stakeAmount : stakeAmount * 2 * 0.95; // 5% house cut on win
  const loserWld    = isTie ? stakeAmount : 0;

  // Update stats for both players
  if (isTie) {
    await Promise.all([
      updateUserStats(game.player1_nullifier, false, loserWld),
      updateUserStats(game.player2_nullifier, false, loserWld),
      updateElo(game.player1_nullifier, 0),
      updateElo(game.player2_nullifier, 0),
    ]);
  } else {
    const player1Won = winnerNullifier === game.player1_nullifier;
    await Promise.all([
      updateUserStats(game.player1_nullifier, player1Won,  player1Won ? winnerWld : loserWld),
      updateUserStats(game.player2_nullifier, !player1Won, player1Won ? loserWld  : winnerWld),
      updateElo(game.player1_nullifier,  player1Won ? 25 : -15),
      updateElo(game.player2_nullifier, !player1Won ? 25 : -15),
    ]);
  }

  // Emit game_over
  const gameOverPayload: GameOverPayload = {
    game_id:         gameId,
    is_tie:          isTie,
    winner_nullifier: winnerNullifier,
    winner_wallet:    winnerWallet,
    player1_score:   game.player1_score,
    player2_score:   game.player2_score,
    stake_amount:    stakeAmount,
    payout_tx_hash:  payoutTxHash,
  };

  io.to(`game:${gameId}`).emit('game_over', gameOverPayload);
}

// ─── Handle a timed-out round (no answers submitted) ─────────────────────────
export async function handleRoundTimeout(
  gameId: string,
  roundNumber: number,
  io: Server
): Promise<void> {
  const round = await getRound(gameId, roundNumber);
  if (!round || round.round_winner !== null) return;

  // Count missing answers as wrong (null stays null, evaluateRound handles null correctly)
  await evaluateRound(gameId, roundNumber, io);
}

// ─── Select questions for a new game ─────────────────────────────────────────
export async function selectGameQuestions(
  gameId: string
): Promise<Array<{ id: string; question_text: string; correct_answer: number; difficulty: 'easy' | 'medium' | 'hard' }>> {
  // 2 easy, 2 medium, 1 hard
  const result = await pool.query(
    `(SELECT id, question_text, correct_answer, difficulty FROM questions WHERE difficulty = 'easy'   ORDER BY RANDOM() LIMIT 2)
     UNION ALL
     (SELECT id, question_text, correct_answer, difficulty FROM questions WHERE difficulty = 'medium' ORDER BY RANDOM() LIMIT 2)
     UNION ALL
     (SELECT id, question_text, correct_answer, difficulty FROM questions WHERE difficulty = 'hard'   ORDER BY RANDOM() LIMIT 1)`
  );
  return result.rows;
}
