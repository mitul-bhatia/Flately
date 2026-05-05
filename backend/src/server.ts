import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import registerChatSocket from './modules/chat/chat.socket';
import { ClientToServerEvents, ServerToClientEvents } from './types/socket';

const server = http.createServer(app);

import env from './config/env';

const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:5174',
  'http://localhost:5173',
];

import { createAdapter } from '@socket.io/redis-adapter';
import { getRedisClient, getRedisSubscriberClient } from './config/redis';
import { socketAuthMiddleware } from './middlewares/socket-auth.middleware';

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Socket CORS blocked: ${origin}`));
      }
    },
    credentials: true,
  },
});

const pubClient = getRedisClient();
const subClient = getRedisSubscriberClient();

if (pubClient && subClient) {
  io.adapter(createAdapter(pubClient, subClient));
  console.log('[Socket.IO] Redis adapter enabled');
} else {
  console.log('[Socket.IO] Memory adapter enabled (Redis disabled)');
}

io.use(socketAuthMiddleware);

registerChatSocket(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server + Socket running on port ${PORT}`);
});
