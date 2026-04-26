import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import {
  getWaitingPairs,
  markMatched,
  cleanExpiredEntries,
} from '../db/queries/matchmaking';
import { createGame, createGameRound } from '../db/queries/games';
import * as contractService from './contract';
import { selectGameQuestions } from './gameEngine';
import { GameStartedPayload, RoundStartPayload, StakeAmount } from '../types';

const STAKE_TIERS: StakeAmount[] = [0.5, 1, 2];

// Map nullifier_hash → socket_id (updated by socket 'join_game' / connect events)
const socketMap = new Map<string, string>();

export function registerSocket(nullifierHash: string, socketId: string): void {
  socketMap.set(nullifierHash, socketId);
}

export function unregisterSocket(nullifierHash: string): void {
  socketMap.delete(nullifierHash);
}

async function runMatchmaking(io: Server): Promise<void> {
  for (const stake of STAKE_TIERS) {
    try {
      const pair = await getWaitingPairs(stake);
      if (pair.length < 2) continue;

      const [player1, player2] = pair;
      const gameId = uuidv4();

      // Select 5 questions: 2 easy + 2 medium + 1 hard
      let questions = await selectGameQuestions(gameId);

      // Fallback: if DB has no questions yet, generate arithmetic placeholders
      if (questions.length < 5) {
        questions = generateFallbackQuestions();
      }

      // Create game record
      await createGame({
        id:                gameId,
        player1_nullifier: player1.nullifier_hash,
        player2_nullifier: player2.nullifier_hash,
        player1_wallet:    player1.wallet_address,
        player2_wallet:    player2.wallet_address,
        stake_amount:      stake,
      });

      // Create 5 round records
      for (let i = 0; i < 5; i++) {
        const q = questions[i];
        await createGameRound({
          id:             uuidv4(),
          game_id:        gameId,
          round_number:   i + 1,
          question_id:    q.id,
          question_text:  q.question_text,
          correct_answer: q.correct_answer,
          difficulty:     q.difficulty,
        });
      }

      // Mark both as matched first (so they can't be re-paired)
      await markMatched(player1.id);
      await markMatched(player2.id);

      // Create on-chain game (non-blocking — failure logged but doesn't abort)
      contractService
        .createGame(gameId, player1.wallet_address, player2.wallet_address, stake)
        .catch((err) =>
          console.error(`[matchmaker] Contract createGame failed for ${gameId}:`, err)
        );

      const startsAt = new Date(Date.now() + 2000).toISOString();

      // Emit game_started to each player via their socket
      const p1SocketId = player1.socket_id ?? socketMap.get(player1.nullifier_hash);
      const p2SocketId = player2.socket_id ?? socketMap.get(player2.nullifier_hash);

      if (p1SocketId) {
        const payload: GameStartedPayload = {
          game_id:            gameId,
          opponent_nullifier: player2.nullifier_hash,
          opponent_wallet:    player2.wallet_address,
          stake_amount:       stake as StakeAmount,
          player_number:      1,
          starts_at:          startsAt,
        };
        io.to(p1SocketId).emit('game_started', payload);
      }

      if (p2SocketId) {
        const payload: GameStartedPayload = {
          game_id:            gameId,
          opponent_nullifier: player1.nullifier_hash,
          opponent_wallet:    player1.wallet_address,
          stake_amount:       stake as StakeAmount,
          player_number:      2,
          starts_at:          startsAt,
        };
        io.to(p2SocketId).emit('game_started', payload);
      }

      // After 2s: emit round_start for round 1
      setTimeout(async () => {
        const round1 = questions[0];
        const roundStartPayload: RoundStartPayload = {
          game_id:       gameId,
          round_number:  1,
          question_text: round1.question_text,
          difficulty:    round1.difficulty,
          time_limit_ms: 15000,
        };
        io.to(`game:${gameId}`).emit('round_start', roundStartPayload);
      }, 2000);

      console.log(
        `[matchmaker] Matched ${player1.nullifier_hash.slice(0, 10)}… vs ${player2.nullifier_hash.slice(0, 10)}… | stake=${stake} WLD | game=${gameId}`
      );
    } catch (err) {
      console.error(`[matchmaker] Error processing stake tier ${stake}:`, err);
    }
  }
}

// ─── Fallback questions (used when DB is empty) ───────────────────────────────
function generateFallbackQuestions(): Array<{
  id: string;
  question_text: string;
  correct_answer: number;
  difficulty: 'easy' | 'medium' | 'hard';
}> {
  return [
    { id: uuidv4(), question_text: '7 + 8 = ?',     correct_answer: 15,  difficulty: 'easy'   },
    { id: uuidv4(), question_text: '15 - 6 = ?',    correct_answer: 9,   difficulty: 'easy'   },
    { id: uuidv4(), question_text: '12 × 4 = ?',    correct_answer: 48,  difficulty: 'medium' },
    { id: uuidv4(), question_text: '81 ÷ 9 = ?',    correct_answer: 9,   difficulty: 'medium' },
    { id: uuidv4(), question_text: '17 × 13 = ?',   correct_answer: 221, difficulty: 'hard'   },
  ];
}

// ─── Public start function ────────────────────────────────────────────────────
export function start(io: Server): void {
  console.log('[matchmaker] Starting matchmaking service (interval: 2s)');

  setInterval(async () => {
    await runMatchmaking(io);
    await cleanExpiredEntries().catch((err) =>
      console.error('[matchmaker] cleanExpiredEntries error:', err)
    );
  }, 2000);
}
