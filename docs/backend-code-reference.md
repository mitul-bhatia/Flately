# Flately Backend Code Reference

> **Last Updated**: 2026-05-03  
> **Purpose**: Complete backend module reference for developers  
> **Stack**: TypeScript + Express + Prisma + Socket.IO

---

## Table of Contents

1. [Module Overview](#module-overview)
2. [Authentication Module](#authentication-module)
3. [Profiles Module](#profiles-module)
4. [Preferences Module](#preferences-module)
5. [Matching Module](#matching-module)
6. [Discovery Module](#discovery-module)
7. [Matches Module](#matches-module)
8. [Chat Module](#chat-module)
9. [Uploads Module](#uploads-module)
10. [Users Module](#users-module)
11. [Middleware Reference](#middleware-reference)
12. [Configuration](#configuration)
13. [Testing](#testing)

---

## Module Overview

The backend follows a clean **Controller → Service → Prisma** architecture pattern:

```
Route (with auth middleware) → Controller (HTTP I/O) → Service (business logic) → Prisma (database)
```

### Directory Structure

```
backend/src/
├── app.ts                          # Express app setup
├── server.ts                       # HTTP + Socket.IO server
├── config/
│   ├── env.ts                      # Zod-validated environment
│   └── prisma.ts                   # PrismaClient singleton
├── middlewares/
│   ├── jwt.middleware.ts           # JWT validation
│   └── controller-chain.middleware.ts  # Auth guards + error mapping
├── modules/
│   ├── auth/                       # Authentication (signup/login/OAuth)
│   ├── profiles/                   # User profile management
│   ├── preferences/                # Matching preferences
│   ├── matching/                   # Compatibility scoring
│   ├── discovery/                  # Discovery feed + swipe
│   ├── matches/                    # Match management
│   ├── chat/                       # Real-time messaging
│   ├── uploads/                    # Cloudinary signatures
│   ├── users.controllers.ts        # User bootstrap
│   ├── users.routes.ts
│   ├── users.service.ts
│   └── shared/
│       └── upsert-by-user-id.service.ts  # Template Method base
└── types/
    ├── auth.ts                     # Auth types
    └── socket.ts                   # Socket.IO types
```

---

## Authentication Module

**Location**: `backend/src/modules/auth/`

### Purpose

Handles user authentication via:
- Email/password signup and login
- Google OAuth flow
- JWT session issuance

### Files

- `auth.controller.ts` - Route handlers (function-based, no class)
- `auth.service.ts` - Strategy + Factory pattern implementation
- `auth.routes.ts` - Route definitions

### Design Patterns

**Strategy Pattern**: Separates authentication methods
- `EmailAuthStrategy` interface
  - `EmailSignUpStrategy` - Creates new users
  - `EmailSignInStrategy` - Validates credentials
- `OAuthAuthorizationStrategy` interface
  - `GoogleOAuthStrategy` - Handles Google OAuth flow

**Factory Pattern**: Centralizes strategy creation
- `AuthStrategyFactory` - Composes email and OAuth factories
- `DefaultEmailAuthStrategyFactory` - Creates email strategies
- `DefaultOAuthAuthorizationStrategyFactory` - Creates OAuth strategies

### Key Functions

```typescript
// Email authentication
export async function signUpWithEmail(credentials: EmailCredentials): Promise<AuthSession>
export async function signInWithEmail(credentials: EmailCredentials): Promise<AuthSession>

// Google OAuth
export function getGoogleAuthorizationUrl(source?: string, redirectOrigin?: string): string
export async function completeGoogleAuthorization(code: string, state: string): Promise<{...}>
export function consumeGoogleExchangeCode(code: string): AuthSession
```

### Routes

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| POST | `/auth/signup` | `signup` | Create email/password account |
| POST | `/auth/login` | `login` | Authenticate with email/password |
| GET | `/auth/google/start` | `startGoogleAuth` | Initiate Google OAuth |
| GET | `/auth/google/callback` | `googleCallback` | OAuth callback handler |
| GET | `/auth/google/exchange` | `exchangeGoogleCode` | Exchange code for session |

### Session Model

```typescript
type AuthSession = {
  accessToken: string  // JWT token
  user: {
    id: string
    email: string
    name: string | null
    picture: string | null
  }
}
```

---

## Profiles Module

**Location**: `backend/src/modules/profiles/`

### Purpose

Manages user profile data including photos, bio, lifestyle preferences, and onboarding status.

### Files

- `profiles.controller.ts` - HTTP handlers
- `profiles.service.ts` - Business logic + Template Method implementation
- `profiles.routes.ts` - Route definitions

### Design Patterns

**Template Method**: Shared upsert lifecycle
- `ProfileUpsertService extends UpsertByUserIdService`
- Implements abstract methods: `findExisting`, `performCreate`, `performUpdate`

**Singleton**: Module-level service instance

### Key Classes

```typescript
class ProfileService {
  async getProfileByUserId(userId: string): Promise<Profile | null>
  async upsertProfile(userId: string, data: Partial<Profile>): Promise<Profile>
}

class ProfileUpsertService extends UpsertByUserIdService<Profile> {
  protected async findExisting(userId: string): Promise<Profile | null>
  protected async performCreate(userId: string, data: Partial<Profile>): Promise<Profile>
  protected async performUpdate(existingId: string, data: Partial<Profile>): Promise<Profile>
}
```

### Routes

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/profiles/me` | `getMyProfile` | ✅ | Get authenticated user's profile |
| POST | `/profiles/me` | `saveMyProfile` | ✅ | Create/update profile |

### Profile Schema

```typescript
{
  id: string
  userId: string
  name?: string
  age?: number
  gender?: string
  bio?: string
  photos: string[]
  city?: string
  hasRoom: boolean
  occupation?: string
  sleepSchedule?: string  // 'early-bird' | 'night-owl' | 'flexible'
  noiseLevel?: number     // 1-5 scale
  guestPolicy?: string    // 'never' | 'rarely' | 'sometimes' | 'often'
  smoking?: string        // 'no' | 'outside' | 'yes'
  pets?: string           // 'no' | 'have' | 'love' | 'allergic'
  onboardingCompleted: boolean
  createdAt: DateTime
  updatedAt: DateTime
}
```

---

## Preferences Module

**Location**: `backend/src/modules/preferences/`

### Purpose

Manages user matching preferences including hard constraints (city, budget, gender) and weighted lifestyle dimensions.

### Files

- `preferences.controller.ts` - HTTP handlers
- `preferences.service.ts` - Business logic + validation
- `preferences.routes.ts` - Route definitions

### Design Patterns

**Template Method**: Shared upsert lifecycle
- `PreferenceUpsertService extends UpsertByUserIdService`

**Validation**: Weight sum must equal 100

### Key Classes

```typescript
class PreferencesService {
  async getPreferencesByUserId(userId: string): Promise<Preference | null>
  async upsertPreferences(userId: string, data: Partial<Preference>): Promise<Preference>
  private validateWeights(data: Partial<Preference>): void
}
```

### Routes

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/preferences/me` | `getMyPreferences` | ✅ | Get user's preferences |
| POST | `/preferences/me` | `saveMyPreferences` | ✅ | Create/update preferences |

### Preference Schema

```typescript
{
  id: string
  userId: string
  // Hard constraints
  genderPreference: string  // 'male' | 'female' | 'any'
  minBudget: number
  maxBudget: number
  city: string
  // Lifestyle signals (1-5 scale)
  cleanliness: number
  sleepSchedule: number
  smoking: boolean
  drinking: boolean
  pets: boolean
  socialLevel: number
  // Weights (must sum to 100)
  weightCleanliness: number
  weightSleep: number
  weightHabits: number
  weightSocial: number
  createdAt: DateTime
  updatedAt: DateTime
}
```

---

## Matching Module

**Location**: `backend/src/modules/matching/`

### Purpose

Computes compatibility scores between users using weighted preference matching algorithm.

### Files

- `matching.controller.ts` - HTTP handlers
- `matching.service.ts` - Matching algorithm + strategies
- `matching.routes.ts` - Route definitions

### Design Patterns

**Strategy Pattern**: Pluggable matching policies
- `EligibilityStrategy` - Determines if two users can match
- `ScoringStrategy` - Calculates compatibility score

**Dependency Injection**: Strategies injected via constructor

### Key Classes

```typescript
interface EligibilityStrategy {
  isEligible(userA: CandidateShape, userB: CandidateShape): boolean
}

interface ScoringStrategy {
  calculateScore(prefA: PreferenceShape, prefB: PreferenceShape): number
}

class MatchingService {
  constructor(
    eligibilityStrategy: EligibilityStrategy,
    scoringStrategy: ScoringStrategy
  )
  
  async findMatchesForUser(userId: string): Promise<Array<{userId: string, score: number}>>
}
```

### Routes

| Method | Path | Handler | Auth | Onboarding Gate | Description |
|--------|------|---------|------|-----------------|-------------|
| GET | `/matching/me` | `getMyMatches` | ✅ | ✅ | Get ranked compatibility scores |

### Algorithm

**Phase 1: Eligibility Filter** (hard constraints)
- Same city
- Budget overlap
- Gender preference mutual compatibility
- Not self

**Phase 2: Compatibility Scoring** (weighted similarity)
```
Score = (cleanliness_similarity × weight_cleanliness) +
        (sleep_similarity × weight_sleep) +
        (habits_similarity × weight_habits) +
        (social_similarity × weight_social)
```

Range: 0-100 (higher = more compatible)

See [matching-algorithm.md](./matching-algorithm.md) for detailed explanation.

---

## Discovery Module

**Location**: `backend/src/modules/discovery/`

### Purpose

Provides discovery feed (ranked candidates) and handles swipe actions.

### Files

- `discovery.controller.ts` - HTTP handlers
- `discovery.service.ts` - Feed generation + swipe logic
- `discovery.routes.ts` - Route definitions

### Key Classes

```typescript
class DiscoveryService {
  async getDiscoveryFeed(userId: string): Promise<EnrichedProfile[]>
  async handleSwipe(fromUserId: string, toUserId: string, action: string): Promise<SwipeResult>
  private generateTags(profile: Profile, preference: Preference | null): string[]
}
```

### Routes

| Method | Path | Handler | Auth | Onboarding Gate | Description |
|--------|------|---------|------|-----------------|-------------|
| GET | `/discovery/feed` | `getDiscoveryFeed` | ✅ | ✅ | Get ranked discovery feed |
| POST | `/discovery/swipe` | `swipeDiscoveryUser` | ✅ | ✅ | Record swipe action |

### Swipe Actions

- `like` - Express interest
- `dislike` - Not interested
- `skip` - Normalized to `dislike`
- `superlike` - Normalized to `like`

### Feed Generation Pipeline

1. Get all users current user has swiped
2. Run matching algorithm for all candidates
3. Filter out already-swiped users
4. Batch fetch profiles and preferences
5. Enrich with compatibility scores and tags
6. Return sorted by compatibility (descending)

---

## Matches Module

**Location**: `backend/src/modules/matches/`

### Purpose

Manages mutual matches and provides enriched match list.

### Files

- `matches.controller.ts` - HTTP handlers
- `matches.service.ts` - Match creation + enrichment
- `matches.routes.ts` - Route definitions

### Key Classes

```typescript
class MatchesService {
  async checkAndCreateMatch(fromUserId: string, toUserId: string): Promise<MatchResult>
  async getMyMatches(userId: string): Promise<EnrichedMatch[]>
  private generateMatchTags(profile: Profile, preference: Preference | null): string[]
}
```

### Routes

| Method | Path | Handler | Auth | Onboarding Gate | Description |
|--------|------|---------|------|-----------------|-------------|
| GET | `/matches/me` | `getMyMatches` | ✅ | ✅ | Get all mutual matches |
| POST | `/matches/connect/:toUserId` | `connectWithUser` | ✅ | ✅ | Legacy like endpoint |

### Match Creation Logic

```
User A swipes "like" on User B
    │
    ├── Check: Has User B already liked User A?
    │     │
    │     ├── NO  → Save swipe only, return { matched: false }
    │     │
    │     └── YES → Create Match (sorted IDs) + return { matched: true }
```

Match IDs are always sorted: `userAId < userBId` for stable compound unique key.

---

## Chat Module

**Location**: `backend/src/modules/chat/`

### Purpose

Handles real-time messaging via Socket.IO and conversation persistence.

### Files

- `chat.controller.ts` - HTTP handlers
- `chat.service.ts` - Conversation + message CRUD
- `chat.socket.ts` - Socket.IO event handlers
- `chat.routes.ts` - Route definitions

### Design Patterns

**Observer/Pub-Sub**: Socket.IO event-driven messaging

### Key Classes

```typescript
class ChatService {
  async getOrCreateConversation(matchId: string): Promise<Conversation>
  async getConversationMessages(conversationId: string): Promise<Message[]>
  async sendMessage(conversationId: string, senderId: string, content: string): Promise<Message>
}
```

### HTTP Routes

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/chat/:matchId` | `openChat` | ✅ | Open/create conversation |

### Socket.IO Events

**Client → Server**

| Event | Payload | Description |
|-------|---------|-------------|
| `joinRoom` | `conversationId: string` | Join conversation room |
| `sendMessage` | `{conversationId, senderId, content}` | Send message |

**Server → Client**

| Event | Payload | Description |
|-------|---------|-------------|
| `message` | `{id, senderId, content, createdAt, timestamp}` | New message broadcast |

### Socket Registration

```typescript
// server.ts
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: { origin: '*' }  // ⚠️ Known security gap (see future-plan.md)
});
registerChatSocket(io);
```

---

## Uploads Module

**Location**: `backend/src/modules/uploads/`

### Purpose

Generates signed Cloudinary upload configurations for secure client-side uploads.

### Files

- `uploads.controller.ts` - HTTP handlers
- `uploads.service.ts` - Signature generation
- `uploads.routes.ts` - Route definitions

### Key Classes

```typescript
class UploadsService {
  generateUploadSignature(): CloudinarySignature
}
```

### Routes

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| POST | `/uploads/signature` | `getUploadSignature` | ✅ | Get signed upload config |

### Response

```typescript
{
  cloudName: string
  apiKey: string
  folder: string
  timestamp: number
  signature: string  // SHA1 signature
}
```

---

## Users Module

**Location**: `backend/src/modules/`

### Purpose

Handles user bootstrap and profile retrieval after authentication.

### Files

- `users.controllers.ts` - HTTP handlers
- `users.service.ts` - User CRUD
- `users.routes.ts` - Route definitions

### Key Classes

```typescript
class UsersService {
  async getOrCreateUser(authPayload: AuthTokenPayload): Promise<User>
}
```

### Routes

| Method | Path | Handler | Auth | Description |
|--------|------|---------|------|-------------|
| GET | `/users/me` | `getUserProfile` | ✅ | Get/create authenticated user |

---

## Middleware Reference

### JWT Middleware

**Location**: `backend/src/middlewares/jwt.middleware.ts`

**Purpose**: Validates JWT tokens and extracts user identity

**Pipeline**:
1. `checkJwt` - Validates Bearer token with `JWT_ACCESS_SECRET`
2. `attachUserId` - Extracts `userId` from `payload.sub` when ObjectId-compatible

**Usage**:
```typescript
import jwtMiddleware from '@/middlewares/jwt.middleware'

router.get('/protected', jwtMiddleware, handler)
```

**Request Augmentation**:
```typescript
interface AuthRequest extends Request {
  auth?: {
    payload?: {
      sub?: string
      email?: string
      name?: string
      picture?: string
    }
  }
  userId?: string
}
```

### Controller Chain Middleware

**Location**: `backend/src/middlewares/controller-chain.middleware.ts`

**Purpose**: Standardizes auth guards and domain error mapping

**Functions**:

```typescript
// Auth guard
function requireAuthenticatedUser(req: AuthRequest, res: Response, next: NextFunction): void

// Domain error mapper
function domainErrorToHttp(error: unknown, res: Response): void

// Chain composer
function withAuthenticatedController(
  handler: (req: AuthRequest, res: Response) => Promise<void>
): RequestHandler
```

**Usage**:
```typescript
export const getMyProfile = withAuthenticatedController(async (req, res) => {
  const profile = await profileService.getProfileByUserId(req.userId!)
  res.json(profile)
})
```

**Error Mapping**:
- `ONBOARDING_REQUIRED` → 403
- `INVALID_CREDENTIALS` → 401
- `EMAIL_ALREADY_EXISTS` → 409
- Default → 500

---

## Configuration

### Environment Variables

**Location**: `backend/src/config/env.ts`

**Validation**: Zod schema with process exit on failure

```typescript
const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('1h'),
  FRONTEND_URL: z.string().default('http://localhost:5174'),
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default('flately/profiles'),
  GOOGLE_OAUTH_CLIENT_ID: z.string().default(''),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().default(''),
  GOOGLE_OAUTH_CALLBACK_URL: z.string().default('http://localhost:4000/auth/google/callback'),
})
```

### Prisma Client

**Location**: `backend/src/config/prisma.ts`

**Pattern**: Lazy singleton via Proxy

```typescript
const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, _receiver) {
    const client = getPrismaClient()
    const value = (client as any)[prop]
    return typeof value === 'function' ? value.bind(client) : value
  }
})
```

**Why Proxy**: Delays PrismaClient instantiation until first property access, allowing environment variables to load first.

---

## Testing

### Test Files

- `backend/src/modules/shared/upsert-by-user-id.service.test.ts` - Template Method tests
- `backend/src/modules/matching/matching.service.test.ts` - Strategy + algorithm tests
- `backend/src/modules/discovery/discovery.service.test.ts` - Feed generation tests
- `backend/src/modules/matches/matches.service.test.ts` - Match enrichment tests
- `backend/src/modules/preferences/preferences.service.test.ts` - Weight validation tests

### Running Tests

```bash
cd backend
npm run test              # Run once
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage
```

### Test Framework

- **Vitest** - Fast unit test runner
- **Mocking**: Prisma client mocked in tests
- **Assertions**: Chai-style expect

---

## Common Patterns

### Module Singleton Pattern

Most services follow this pattern:

```typescript
// service.ts
class SomeService {
  async someMethod() { /* ... */ }
}

const someService = new SomeService()

export async function someMethod() {
  return someService.someMethod()
}
```

**Exception**: Auth module uses direct function exports + factory-driven object creation.

### Onboarding Gate Pattern

Protected endpoints check onboarding status:

```typescript
async function assertOnboardingCompleted(userId: string): Promise<void> {
  const profile = await prisma.profile.findUnique({ where: { userId } })
  if (!profile?.onboardingCompleted) {
    throw new Error('ONBOARDING_REQUIRED')
  }
}
```

Mapped to HTTP 403 by `domainErrorToHttp`.

### Enrichment Pattern

Services often enrich data with related entities:

```typescript
// 1. Batch fetch related data
const profiles = await prisma.profile.findMany({ where: { userId: { in: userIds } } })
const preferences = await prisma.preference.findMany({ where: { userId: { in: userIds } } })

// 2. Build lookup maps
const profileByUserId = new Map(profiles.map(p => [p.userId, p]))
const preferenceByUserId = new Map(preferences.map(p => [p.userId, p]))

// 3. Enrich from maps (no N+1 queries)
const enriched = candidates.map(c => ({
  ...c,
  profile: profileByUserId.get(c.userId),
  preference: preferenceByUserId.get(c.userId)
}))
```

---

## Quick Reference

### Import Paths

```typescript
// Config
import env from '@/config/env'
import prisma from '@/config/prisma'

// Middleware
import jwtMiddleware from '@/middlewares/jwt.middleware'
import { withAuthenticatedController } from '@/middlewares/controller-chain.middleware'

// Types
import type { AuthRequest } from '@/types/auth'
import type { ClientToServerEvents, ServerToClientEvents } from '@/types/socket'
```

### Common Operations

```typescript
// Get authenticated user ID
const userId = req.userId!  // Set by attachUserId middleware

// Check onboarding
await assertOnboardingCompleted(userId)

// Sign JWT
const token = jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN })

// Verify JWT
const payload = jwt.verify(token, env.JWT_ACCESS_SECRET)
```

---

## Related Documentation

- [API Reference](./api-reference.md) - Complete REST + Socket.IO API
- [Architecture](./architecture.md) - System architecture overview
- [Database Schema](./database-schema.md) - Prisma models and relationships
- [Matching Algorithm](./matching-algorithm.md) - Detailed algorithm explanation
- [Future Plan](./future-plan.md) - Known issues and roadmap

---

## Maintenance Notes

1. **Auth module is intentionally different** - Uses direct function exports + factories instead of singleton pattern
2. **Socket CORS is open** - Known security gap, see [future-plan.md](./future-plan.md) FP-001
3. **Socket events are unauthenticated** - Known security gap, see [future-plan.md](./future-plan.md) FP-002
4. **Matching service loads all preferences** - Performance gap, see [future-plan.md](./future-plan.md) FP-004
5. **Production build fails** - Module resolution issue, see [future-plan.md](./future-plan.md) FP-003

---

**Last Verified**: 2026-05-03  
**Backend Version**: TypeScript 5.9.3 + Express 5.2.1 + Prisma 6.19.2
