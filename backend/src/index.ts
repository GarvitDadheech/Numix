import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';

import { generalLimiter } from './middleware/rateLimit';
import authRouter from './routes/auth';
import paymentRouter from './routes/payment';
import matchmakingRouter from './routes/matchmaking';
import leaderboardRouter from './routes/leaderboard';
import notificationsRouter from './routes/notifications';
import { createGameRouter } from './routes/game';
import { start as startMatchmaker, registerSocket, unregisterSocket } from './services/matchmaker';
import { updateRoundAnswer, getRound } from './db/queries/games';
import { evaluateRound } from './services/gameEngine';
import { updateSocketId } from './db/queries/matchmaking';

// ─── App setup ────────────────────────────────────────────────────────────────
const app  = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

// Security & parsing
app.use(helmet());
app.use(cors({
  origin:      FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());

// General rate limit applied to all routes
app.use(generalLimiter);

// Health check (no auth, no rate limit overhead)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: 'numix', timestamp: new Date().toISOString() });
});

// ─── HTTP server + Socket.io ──────────────────────────────────────────────────
const httpServer = createServer(app);

const io = new Server(httpServer, {
  path: '/socket',
  cors: {
    origin:      FRONTEND_URL,
    credentials: true,
  },
});

// Mount routes that need io first
app.use('/api/game',          createGameRouter(io));

// Remaining routes
app.use('/api/auth',          authRouter);
app.use('/api/payment',       paymentRouter);
app.use('/api/matchmaking',   matchmakingRouter);
app.use('/api/leaderboard',   leaderboardRouter);
app.use('/api/notifications', notificationsRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Socket.io event handlers ─────────────────────────────────────────────────
// Track nullifier → socketId for matchmaker payloads
const nullifierToSocket = new Map<string, string>();

io.on('connection', (socket) => {
  console.log(`[socket] Client connected: ${socket.id}`);

  // join_game: { game_id, nullifier_hash }
  socket.on('join_game', async (data: { game_id: string; nullifier_hash: string }) => {
    const { game_id, nullifier_hash } = data;
    if (!game_id || !nullifier_hash) return;

    const room = `game:${game_id}`;
    await socket.join(room);

    // Register mapping for future matchmaker emissions
    nullifierToSocket.set(nullifier_hash, socket.id);
    registerSocket(nullifier_hash, socket.id);

    // Update socket_id in matchmaking_queue if still present
    updateSocketId(nullifier_hash, socket.id).catch(() => {
      // Ignore — player may already be matched and removed
    });

    console.log(`[socket] ${socket.id} joined room ${room}`);
  });

  // answer_submitted via socket (alternative to REST submit-answer)
  socket.on(
    'answer_submitted',
    async (data: {
      game_id:        string;
      round:          number;
      answer:         number;
      time_ms:        number;
      nullifier_hash: string;
    }) => {
      const { game_id, round, answer, time_ms, nullifier_hash } = data;
      if (!game_id || round === undefined || answer === undefined || !nullifier_hash) return;

      try {
        // Determine player number from nullifier
        const { getGame } = await import('./db/queries/games');
        const game = await getGame(game_id);
        if (!game || game.status !== 'active') return;

        let playerNum: 1 | 2;
        if (game.player1_nullifier === nullifier_hash) {
          playerNum = 1;
        } else if (game.player2_nullifier === nullifier_hash) {
          playerNum = 2;
        } else {
          return;
        }

        // Check not already answered
        const existingRound = await getRound(game_id, round);
        if (!existingRound) return;

        const alreadyAnswered =
          playerNum === 1
            ? existingRound.player1_answer !== null
            : existingRound.player2_answer !== null;

        if (alreadyAnswered) return;

        await updateRoundAnswer(game_id, round, playerNum, answer, time_ms ?? 0);

        // Check if both have now answered
        const updatedRound = await getRound(game_id, round);
        if (
          updatedRound &&
          updatedRound.player1_answer !== null &&
          updatedRound.player2_answer !== null
        ) {
          await evaluateRound(game_id, round, io);
        }
      } catch (err) {
        console.error('[socket] answer_submitted error:', err);
      }
    }
  );

  // request_rematch: { game_id, nullifier_hash }
  socket.on('request_rematch', (data: { game_id: string; nullifier_hash: string }) => {
    const { game_id, nullifier_hash } = data;
    if (!game_id || !nullifier_hash) return;

    io.to(`game:${game_id}`).emit('rematch_requested', {
      game_id,
      requested_by: nullifier_hash,
    });
  });

  // chat_message: { game_id, message, nullifier_hash }
  socket.on(
    'chat_message',
    (data: { game_id: string; message: string; nullifier_hash: string }) => {
      const { game_id, message, nullifier_hash } = data;
      if (!game_id || !message || !nullifier_hash) return;

      // Sanitize message length
      const sanitized = message.slice(0, 200);

      io.to(`game:${game_id}`).emit('chat_message', {
        game_id,
        message:        sanitized,
        nullifier_hash,
        timestamp:      new Date().toISOString(),
      });
    }
  );

  // disconnect
  socket.on('disconnect', (reason) => {
    console.log(`[socket] Client disconnected: ${socket.id} (reason: ${reason})`);

    // Remove from nullifier map
    for (const [nullifier, sid] of nullifierToSocket.entries()) {
      if (sid === socket.id) {
        nullifierToSocket.delete(nullifier);
        unregisterSocket(nullifier);
        break;
      }
    }
  });
});

// ─── Start matchmaker ─────────────────────────────────────────────────────────
startMatchmaker(io);

// ─── Start server ─────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`[numix] Server running on port ${PORT} (${process.env.NODE_ENV ?? 'development'})`);
  console.log(`[numix] Frontend allowed: ${FRONTEND_URL}`);
});
