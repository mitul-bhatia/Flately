import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import env from './config/env';
import { getRedisClient } from './config/redis';

import profileRoutes from './modules/profiles/profiles.routes';
import preferenceRoutes from './modules/preferences/preferences.routes';
import userRoutes from './modules/users.routes';
import matchingRoutes from './modules/matching/matching.routes';
import matchRoutes from './modules/matches/matches.routes';
import discoveryRoutes from './modules/discovery/discovery.routes';
import chatRoutes from './modules/chat/chat.routes';
import authRoutes from './modules/auth/auth.routes';
import uploadsRoutes from './modules/uploads/uploads.routes';
import { domainErrorMiddleware } from './middlewares/domain-error.middleware';

function buildAllowedOrigins(): string[] {
  const defaults = [
    env.FRONTEND_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
  ];

  return [...new Set(defaults.filter(Boolean))];
}

function isLocalDevOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

const app = express();
app.use(helmet());

const allowedOrigins = buildAllowedOrigins();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || isLocalDevOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);

const redisClient = getRedisClient();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  ...(redisClient ? {
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as any,
      prefix: 'rl:',
    })
  } : {}),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  ...(redisClient ? {
    store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)) as any,
      prefix: 'rl_auth:',
    })
  } : {}),
  message: { error: 'TOO_MANY_REQUESTS', retryAfter: '15 minutes' },
});

app.use(express.json());
app.use('/auth/login', authLimiter);
app.use('/auth/signup', authLimiter);
app.use(limiter);
app.use('/auth', authRoutes);
app.use('/uploads', uploadsRoutes);
app.use('/matching', matchingRoutes);
app.use('/profiles', profileRoutes);
app.use('/discovery', discoveryRoutes);
app.use('/users', userRoutes);
app.use('/matches', matchRoutes);
app.use('/chat', chatRoutes);
app.use('/preferences', preferenceRoutes);
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(domainErrorMiddleware as any);

export default app;
