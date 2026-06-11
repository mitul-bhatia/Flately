# Flately — System Architecture

> Source-of-truth note: authentication and route-state behavior are defined in `docs/product-user-flow.md`.

> **Version**: 2.5 CURRENT  
> **Last Updated**: 2026-04-06  
> **Stack**: TypeScript Full-Stack · MongoDB · JWT Auth · Google OAuth · Socket.IO

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                        │
│  React 19 + Vite 7 + Redux Toolkit + TailwindCSS v4            │
│  Email/password + Google OAuth UI + Socket.IO Client            │
│  Port: 5174 (local default target)                              │
└────────────────────┬──────────────────┬─────────────────────────┘
                     │ REST (Fetch Adapter + Strategy)
                     │ Bearer JWT       │ WebSocket (Socket.IO)
                     ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND SERVER                           │
│  Express 5 + TypeScript + http.createServer()                   │
│  Helmet · CORS · Rate Limiting · Zod Env Validation             │
│  Port: 4000                                                     │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  REST API    │  │  Socket.IO   │  │  JWT Middleware      │   │
│  │  (9 routers) │  │  (chat ns)   │  │  (shared secret)     │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────┘   │
│         │                 │                                      │
│         ▼                 ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Prisma ORM (PrismaClient singleton)         │   │
│  └──────────────────────────┬───────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  MongoDB Atlas (Cluster0)                        │
│  Database: flately                                              │
│  Collections: User, Profile, Preference, Swipe, Match,          │
│               Conversation, Message                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack — Exact Versions

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 22.x | Runtime |
| TypeScript | ^5.9.3 | Language |
| Express | ^5.2.1 | HTTP framework |
| Prisma | ^6.12.0 / Client ^6.19.1 | ORM for MongoDB |
| Socket.IO | ^4.8.3 | Real-time WebSocket |
| jsonwebtoken | ^9.0.3 | JWT validation/signing |
| Zod | ^3.23.8 | Runtime schema validation |
| Helmet | ^8.1.0 | HTTP security headers |
| cors | ^2.8.5 | Cross-origin resource sharing |
| express-rate-limit | ^8.2.1 | Rate limiting |
| bcrypt | ^6.0.0 | Password hashing (future use) |
| jsonwebtoken | ^9.0.3 | JWT utility |
| tsx | ^4.19.2 | TypeScript execution (dev) |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | ^19.2.3 | UI framework |
| Vite | ^7.2.4 | Build tool / dev server |
| TypeScript | ^5.9.3 | Language |
| TailwindCSS | ^4.1.18 | CSS framework (v4 with `@import "tailwindcss"`) |
| Redux Toolkit | ^2.11.2 | State management |
| React Router DOM | ^6.28.0 | Client-side routing |
| Custom Auth Provider | internal | Session bootstrap and persistence |
| Native Fetch Transport | internal | HTTP client via Adapter + Strategy (`HttpClientAdapter`, `FetchRequestStrategy`) |
| Framer Motion | ^12.29.2 | Animations |
| Socket.IO Client | ^4.8.3 | Real-time WebSocket |
| React Hook Form | ^7.71.1 | Form management |
| Zod | ^4.3.5 | Form validation |
| Radix UI | Various ^1.x | Accessible primitives |
| Lucide React | ^0.563.0 | Icons (alongside Material Symbols) |
| Storybook | ^10.3.3 | Component development |
| Vitest | ^4.1.1 | Testing framework |
| Playwright | ^1.58.2 | Browser testing |

---

## 3. Authentication Flow (JWT + Google OAuth)

```
┌──────────┐     ┌───────────────┐     ┌─────────────┐
│  Browser │────▶│ /auth/signup  │────▶│ JWT session │
│          │────▶│ /auth/login   │────▶│ persisted   │
└──────────┘     └───────────────┘     └──────┬──────┘
      │                                        │
      │     ┌──────────────────────────────────┘
      ▼     ▼
┌──────────────────────────────────────────────────────────────┐
│ /auth/google/start -> /auth/google/callback -> /auth/google/exchange │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
                        Standard JWT session
```

### JWT Configuration

```typescript
// Backend — middlewares/jwt.middleware.ts
const payload = jwt.verify(token, env.JWT_ACCESS_SECRET)
```

### Auth Middleware Pipeline

Every protected endpoint goes through:
1. **`checkJwt`** — Validates the Bearer token with shared secret
2. **`attachUserId`** — Extracts `req.auth.payload.sub` when ObjectId-compatible

```typescript
// middlewares/jwt.middleware.ts
export default [checkJwt, attachUserId] as RequestHandler[];
```

### Google OAuth Endpoints

- `GET /auth/google/start`
- `GET /auth/google/callback`
- `GET /auth/google/exchange`

Implementation note:

- `/auth/google/exchange` currently accepts `code` from query and also supports body fallback for compatibility with mixed clients.

### Auth Bootstrap (Frontend)

After session restoration, the app fetches profile state and enforces onboarding guards before entering protected routes.

---

## 4. Backend Module Architecture

```
backend/src/
├── app.ts                          # Express app setup (middleware + routes)
├── server.ts                       # HTTP server + Socket.IO bootstrap
├── config/
│   ├── env.ts                      # Zod-validated environment variables
│   └── prisma.ts                   # PrismaClient singleton
├── middlewares/
│   ├── jwt.middleware.ts           # JWT validation + userId extraction
│   └── controller-chain.middleware.ts  # Auth precondition + domain error mapping chain
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts      # signup/login/google OAuth handlers
│   │   ├── auth.routes.ts          # /auth routes
│   │   └── auth.service.ts         # credential + OAuth + session issuance logic
│   ├── uploads/
│   │   ├── uploads.controller.ts   # POST /uploads/signature
│   │   ├── uploads.routes.ts
│   │   └── uploads.service.ts      # Cloudinary upload signature generation
│   ├── users.controllers.ts        # GET /users/me
│   ├── users.routes.ts             # Router for /users
│   ├── users.service.ts            # getOrCreateUser()
│   ├── profiles/
│   │   ├── profiles.controller.ts  # GET/POST /profiles/me
│   │   ├── profiles.routes.ts
│   │   └── profiles.service.ts     # getProfileByUserId(), ProfileUpsertService-based upsert
│   ├── preferences/
│   │   ├── preferences.controller.ts  # GET/POST /preferences/me
│   │   ├── preferences.routes.ts
│   │   └── preferences.service.ts     # Weight validation + PreferenceUpsertService-based upsert
│   ├── matching/
│   │   ├── matching.controller.ts  # GET /matching/me
│   │   ├── matching.routes.ts
│   │   └── matching.service.ts     # Strategy seams + deterministic tie-order ranking
│   ├── discovery/
│   │   ├── discovery.controller.ts # GET /discovery/feed, POST /discovery/swipe
│   │   ├── discovery.routes.ts
│   │   └── discovery.service.ts    # Feed generation + swipe handler
│   ├── matches/
│   │   ├── matches.controller.ts   # GET /matches/me
│   │   ├── matches.routes.ts
│   │   └── matches.service.ts      # Mutual like detection + match creation
│   └── chat/
│       ├── chat.controller.ts      # GET /chat/:matchId
│       ├── chat.routes.ts
│       ├── chat.service.ts         # Conversation + message CRUD
│       └── chat.socket.ts          # Socket.IO event handlers
│   └── shared/
│       └── upsert-by-user-id.service.ts  # Shared upsert lifecycle abstraction
└── types/
    ├── auth.ts                     # AuthRequest, AuthTokenPayload
    └── socket.ts                   # ServerToClientEvents, ClientToServerEvents
```

Type inventory note:

- `backend/src/types/api.ts` and `backend/src/types/database.ts` were removed as unused on 2026-04-14.
- Active backend shared types are `auth.ts` and `socket.ts`.

### Module Pattern

Every backend module follows the **Controller → Service → Prisma** pattern:

```
Route (auth middleware) → Controller (request/response) → Service (business logic) → Prisma (DB)
```

Cross-cutting backend notes:
- `withAuthenticatedController(...)` standardizes auth preconditions and error mapping for protected controllers.
- `UpsertByUserIdService` removes duplicated create/update lifecycle branches in profile and preference services.
- Matching internals expose strategy seams (`EligibilityStrategy`, `ScoringStrategy`) while preserving external output contract.
- Tie scores are resolved deterministically by insertion order to keep stable ranking output.

---

## 5. Express App Configuration

```typescript
// app.ts — Middleware stack (applied in order)
app.use(helmet());                    // Security headers
app.use(cors({ origin: originValidator, credentials: true }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,           // 15 minutes
  max: 100,                            // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false
}));
app.use(express.json());              // JSON body parser

// Route registration
app.use('/auth',       authRoutes);
app.use('/uploads',    uploadsRoutes);
app.use('/matching',    matchingRoutes);
app.use('/profiles',    profileRoutes);
app.use('/discovery',   discoveryRoutes);
app.use('/users',       userRoutes);
app.use('/matches',     matchRoutes);
app.use('/chat',        chatRoutes);
app.use('/preferences', preferenceRoutes);
app.get('/health', (_, res) => res.json({ status: 'ok' }));
```

### Server Bootstrap

```typescript
// server.ts
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: { origin: '*' }   // ← NOTE: Socket.IO CORS is more permissive than Express
});
registerChatSocket(io);
server.listen(PORT || 4000);
```

---

## 6. Environment Configuration

### Backend `.env`

```env
PORT=4000
DATABASE_URL="mongodb+srv://<user>:<pass>@cluster0.vthoeo7.mongodb.net/flately"
JWT_ACCESS_SECRET="replace-with-strong-secret"
JWT_ACCESS_EXPIRES_IN="1h"
FRONTEND_URL="http://localhost:5174"
GOOGLE_OAUTH_CLIENT_ID="your-google-client-id"
GOOGLE_OAUTH_CLIENT_SECRET="your-google-client-secret"
GOOGLE_OAUTH_CALLBACK_URL="http://localhost:4000/auth/google/callback"
CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"
CLOUDINARY_UPLOAD_FOLDER="flately/profiles"
```

### Frontend runtime config (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
```

Runtime wiring notes:
- Frontend transport runtime values are read through `runtimeConfig`.
- Cloudinary upload uses backend signed config endpoint first (`/uploads/signature`) and falls back to unsigned preset when needed.
- No frontend source edits are required per environment when these variables are set.

### Zod Validation

```typescript
// config/env.ts
const envSchema = z.object({
  PORT:           z.coerce.number().default(4000),
  DATABASE_URL:   z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET is required'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('1h'),
  FRONTEND_URL: z.string().default('http://localhost:5174'),
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default('flately/profiles'),
  GOOGLE_OAUTH_CLIENT_ID: z.string().default(''),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().default(''),
  GOOGLE_OAUTH_CALLBACK_URL: z.string().default('http://localhost:4000/auth/google/callback'),
});
// Exits process on validation failure
```

---

## 7. Frontend Architecture

```
frontend/src/
├── main.tsx                           # App entry (Redux + AuthProvider + AuthBootstrap + Router)
├── app/
│   ├── router.tsx                     # Route map including /auth/callback
│   ├── store.ts                       # Redux store
│   ├── AppLayout.tsx                  # Sidebar + protected shell
│   └── ProtectedRoute.tsx             # Auth/profile onboarding guard
├── pages/
│   ├── LandingPage.tsx
│   ├── LoginPage.tsx
│   ├── SignupPage.tsx
│   └── GoogleAuthCallbackPage.tsx
├── features/
│   ├── auth/                          # Session persistence, bootstrap, OAuth handoff
│   ├── preauth/                       # Questionnaire capture before auth
│   ├── onboarding/
│   ├── dashboard/
│   ├── discovery/
│   ├── matches/
│   ├── chat/
│   └── profile/                       # ProfileEditorPage + ProfilePhotoManager
├── services/
│   ├── api.ts                         # Fetch Adapter + Strategy + ApiError
│   ├── auth.transport.ts
│   ├── profile.transport.ts
│   ├── preferences.transport.ts
│   ├── discovery.transport.ts
│   ├── matches.transport.ts
│   └── chat.transport.ts
└── config/
    └── runtimeConfig.ts               # API/Socket/Cloudinary runtime values
```

### Component Hierarchy

```
<StrictMode>
  <Provider store>
    <AuthProvider>
      <AuthBootstrap>
        <RouterProvider>
          ├── <LandingPage />                         (path: /)
          ├── <LoginPage />                           (path: /login)
          ├── <SignupPage />                          (path: /signup)
          ├── <GoogleAuthCallbackPage />              (path: /auth/callback)
          └── <AppLayout>                             (path: /app/*)
               └── <ProtectedRoute>
                    ├── <DashboardPage />             (path: /app)
                    ├── <OnboardingPage />            (path: /app/onboarding)
                    ├── <DiscoveryPage />             (path: /app/discover)
                    ├── <MatchesPage />               (path: /app/matches)
                    ├── <ChatPage />                  (path: /app/chat/:matchId?)
                    └── <ProfileEditorPage />         (path: /app/profile)
```

---

## 8. State Management (Redux Toolkit)

```typescript
// app/store.ts
export const store = configureStore({
  reducer: {
    auth:        authReducer,        // {isAuthenticated, user, loading}
    onboarding:  onboardingReducer,  // {profile, loading, completed}
    preferences: preferenceReducer,  // Preference form state
    discovery:   discoveryReducer,   // {feed[], loading}
    matches:     matchesReducer,     // {list[], loading}
    chat:        chatReducer,        // {conversations{}, activeConversationId, loading, error}
  }
});
```

### Slice Actions Summary

| Slice | Actions |
|---|---|
| `auth` | `setAuth(user)`, `clearAuth()` |
| `onboarding` | `startLoading()`, `setProfile(profile)` |
| `discovery` | `start()`, `setFeed(feed)`, `removeUser(userId)` |
| `matches` | `start()`, `setMatches(list)` |
| `chat` | `setLoading()`, `setActiveConversation(id)`, `setConversation({id, messages})`, `addMessage({conversationId, message})`, `setError(msg)`, `clearChat()` |
| `preferences` | (standard CRUD pattern) |

---

## 9. API Client Pattern

```typescript
// services/api.ts
const apiClient = new HttpClientAdapter(
  new FetchRequestStrategy(),
  runtimeConfig.apiBaseUrl,
)

export async function apiRequest<T>(config: ApiRequestConfig): Promise<T> {
  return apiClient.request<T>(config)
}
```

Canonical transport behavior:

- Replaced Axios transport with Adapter + Strategy in `api.ts`
- Kept existing service call contract unchanged, so feature modules still call `apiRequest(...)`
- Preserved auth token injection and one-shot 401 unauthorized handling behavior
- Added a structured manual error model (`ApiError`) so existing UI error mapping still works

Pattern fit for transport:

- Strategy: `FetchRequestStrategy` handles low-level HTTP execution
- Adapter: `HttpClientAdapter` adapts app-level request config to the strategy and centralizes cross-cutting auth behavior

Auth continuation behavior uses a separate Strategy seam:

- Strategy module: `frontend/src/features/auth/authContinuationResolver.ts`
- Goal: unify post-auth route resolution across signup, login, and Google OAuth callback
- Current strategy order:
  - `QuestionnaireSourceStrategy` (`source=questionnaire` -> `/app/onboarding`)
  - `SignupDefaultStrategy` (`signup` -> `/app/onboarding`)
  - `DefaultAppStrategy` (fallback -> `/app`)

Usage pattern across feature transports:

```typescript
const data = await apiRequest({
  method: 'POST',
  url: '/endpoint',
  data: payload,
})
```

---

## 10. Real-Time Communication (Socket.IO)

### Server-Side

```typescript
// chat.socket.ts
io.on('connection', (socket) => {
  socket.on('joinRoom', (conversationId) => socket.join(conversationId));
  socket.on('sendMessage', async ({ conversationId, senderId, content }) => {
    const msg = await sendMessage(conversationId, senderId, content);
    const payload = {
      id: msg.id, senderId: msg.senderId,
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
      timestamp: msg.createdAt.toISOString(),
    };
    io.to(conversationId).emit('message', payload);
  });
});
```

### Client-Side

```typescript
// chat/socket.ts
export const socket = io(runtimeConfig.socketUrl);

// ChatPage.tsx
socket.emit('joinRoom', conversationId);
socket.emit('sendMessage', { conversationId, senderId, content });
socket.on('message', (msg) => setMessages(prev => [...prev, msg]));
```

### Socket Event Contract

| Direction | Event | Payload |
|---|---|---|
| Client → Server | `joinRoom` | `conversationId: string` |
| Client → Server | `sendMessage` | `{ conversationId, senderId, content }` |
| Server → Client | `message` | `{ id, senderId, content, createdAt, timestamp }` |

---

## 11. Routing Map

| Path | Component | Auth Required | Description |
|---|---|---|---|
| `/` | `LandingPage` | No | Public landing page |
| `/start` | `PreAuthQuestionnairePage` | No | Pre-auth questionnaire |
| `/login` | `LoginPage` | No | Email/password or Google sign-in |
| `/signup` | `SignupPage` | No | Account creation + Google sign-in |
| `/auth/callback` | `GoogleAuthCallbackPage` | No | OAuth callback exchange page |
| `/app` | `DashboardPage` | Yes | Main dashboard |
| `/app/onboarding` | `OnboardingPage` | Yes | 6-step profile setup with required photo step |
| `/app/discover` | `DiscoveryPage` | Yes | Browse potential roommates |
| `/app/matches` | `MatchesPage` | Yes | View match history |
| `/app/chat/:matchId?` | `ChatPage` | Yes | Real-time messaging |
| `/app/profile` | `ProfileEditorPage` | Yes | Profile editor |
| `*` | `Navigate('/')` | No | Redirect to landing |

---

## 12. Build & Development Commands

### Backend

```bash
cd backend
npm install
npm run dev          # tsx watch src/server.ts (hot reload)
npm run build        # tsc → dist/
npm run start:prod   # node dist/server.js
npm run seed         # Dataset-driven idempotent seed from backend/seed/flately_dataset.json
npm run seed -- --dry-run  # Validate dataset + references with no DB writes
npm run seed:reset   # Clear seeded collections then reseed from dataset
npm run typecheck    # tsc --noEmit
```

### Frontend

```bash
cd frontend
npm install
npm run dev          # vite dev server on http://localhost:5174 (default)
npm run build        # vite build → dist/
npm run preview      # vite preview (production build preview)
npm run lint         # eslint
npm run storybook    # storybook dev on port 6006
```
