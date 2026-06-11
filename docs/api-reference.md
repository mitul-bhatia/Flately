# Flately — Complete API Reference

> **Base URL**: `http://localhost:4000`  
> **Auth**: `/health` and `/auth/*` are public; all other endpoints require `Authorization: Bearer <JWT>` header  
> **Content-Type**: `application/json`

---

## Authentication

Flately supports two sign-in modes:

- Email/password via `/auth/signup` and `/auth/login`
- Google OAuth via `/auth/google/start` -> `/auth/google/callback` -> `/auth/google/exchange`

All protected endpoints use local JWT validation middleware:

```
Authorization: Bearer <access_token>
```

Tokens are issued by:

- `POST /auth/signup`
- `POST /auth/login`

### Frontend Transport Contract (Canonical)

The frontend transport layer uses native fetch with explicit Adapter + Strategy roles.

- Replaced Axios transport with Adapter + Strategy in `api.ts`
- Kept existing service call contract unchanged, so feature modules still call `apiRequest(...)`
- Preserved auth token injection and one-shot 401 unauthorized handling behavior
- Added a structured manual error model (`ApiError`) so existing UI error mapping still works

Pattern fit for transport:

- Strategy: `FetchRequestStrategy` handles low-level HTTP execution
- Adapter: `HttpClientAdapter` adapts app-level request config to the strategy and centralizes cross-cutting auth behavior

### `POST /auth/signup`

Create an email/password account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "accessToken": "<jwt>",
  "user": {
    "id": "665f1a2b3c4d5e6f7a8b9c0d",
    "email": "user@example.com",
    "name": "John Doe",
    "picture": null
  }
}
```

**Error Responses:**

- `400` — `Email and password are required`
- `409` — `EMAIL_ALREADY_EXISTS`
- `500` — `AUTH_STORAGE_CONFLICT`

### `POST /auth/login`

Authenticate an existing email/password account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Response (200):**
```json
{
  "accessToken": "<jwt>",
  "user": {
    "id": "665f1a2b3c4d5e6f7a8b9c0d",
    "email": "user@example.com",
    "name": "John Doe",
    "picture": null
  }
}
```

**Error Responses:**

- `400` — `Email and password are required`
- `401` — `INVALID_CREDENTIALS`

The middleware validates the token with `JWT_ACCESS_SECRET` and extracts `req.userId` from `payload.sub` when it is an ObjectId-compatible value.

### `GET /auth/google/start`

Start Google OAuth login/signup flow.

Optional query params:

- `source`: `login`, `signup`, or `questionnaire`
- `redirectOrigin`: frontend origin (for example `http://localhost:5174`)

Behavior:

- If Google OAuth is configured, redirects to Google consent.
- If not configured, redirects back to frontend `/login` with `error=GOOGLE_OAUTH_NOT_CONFIGURED`.

### `GET /auth/google/callback`

OAuth callback endpoint used by Google.

Expected query params:

- `code`
- `state`

Behavior:

1. Validates OAuth state.
2. Exchanges authorization code with Google.
3. Resolves user by `googleId` or email and issues JWT session.
4. Redirects to frontend `/auth/callback?code=<one-time-exchange-code>`.

### `GET /auth/google/exchange`

Exchange one-time code for a standard Flately auth session.

Input:

- `code` (required, query param in canonical flow)

Compatibility behavior:

- Controller also reads body `code` for mixed-client compatibility.

Success response (200):

```json
{
  "accessToken": "<jwt>",
  "user": {
    "id": "665f1a2b3c4d5e6f7a8b9c0d",
    "email": "user@example.com",
    "name": "John Doe",
    "picture": "https://lh3.googleusercontent.com/..."
  }
}
```

Error responses:

- `400` — `GOOGLE_AUTH_CODE_MISSING`
- `400` — `GOOGLE_EXCHANGE_CODE_INVALID`

### `POST /uploads/signature`

Return a signed Cloudinary payload for authenticated image uploads.

**Auth**: Required

Request body:
```json
{}
```

Success response (200):

```json
{
  "cloudName": "demo",
  "apiKey": "123456789012345",
  "folder": "flately/profiles",
  "timestamp": 1775427000,
  "signature": "<sha1-signature>"
}
```

Error responses:

- `401` — `Unauthorized`
- `503` — `CLOUDINARY_NOT_CONFIGURED`
- `500` — `UPLOAD_SIGNATURE_FAILED`

---

## 1. Health Check

### `GET /health`

No auth required. Returns server status.

**Response:**
```json
{ "status": "ok" }
```

---

## 2. Users Module

### `GET /users/me`

Get or create the authenticated user's record. Called automatically after a successful login/signup session bootstrap.

**Auth**: Required  
**Middleware**: `checkJwt → attachUserId → getUserProfile`

**Logic:**
1. Extract `sub`, `email`, `name`, `picture` from JWT payload
2. Look up User by `id == payload.sub`
3. If not found and email exists -> create new User by email
4. Return a sanitized user object (never returns `passwordHash`)

**Response (200):**
```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c0d",
  "email": "user@example.com",
  "name": "John Doe",
  "picture": "https://lh3.googleusercontent.com/...",
  "createdAt": "2026-03-20T10:30:00.000Z",
  "updatedAt": "2026-03-20T10:35:00.000Z"
}
```

**Error Responses:**
- `401` — Missing or invalid JWT
- `500` — Internal server error

---

## 3. Profiles Module

### `GET /profiles/me`

Get the authenticated user's profile.

**Auth**: Required  
**Response (200):**
```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c0e",
  "userId": "665f1a2b3c4d5e6f7a8b9c0d",
  "name": "John Doe",
  "age": 26,
  "gender": "male",
  "bio": "Looking for a clean roommate...",
  "photos": ["https://..."],
  "city": "San Francisco",
  "hasRoom": true,
  "occupation": "professional",
  "sleepSchedule": "night-owl",
  "noiseLevel": 3,
  "guestPolicy": "sometimes",
  "smoking": "no",
  "pets": "love",
  "onboardingCompleted": true,
  "createdAt": "2026-03-20T10:30:00.000Z",
  "updatedAt": "2026-03-20T10:35:00.000Z"
}
```

Returns `null` if no profile exists yet.

---

### `POST /profiles/me`

Create or update the authenticated user's profile. Used by the onboarding flow.

**Auth**: Required  
**Request Body:**
```json
{
  "name": "John Doe",
  "age": 26,
  "gender": "male",
  "bio": "Looking for a clean roommate",
  "photos": ["https://..."],
  "city": "San Francisco",
  "hasRoom": true,
  "occupation": "professional",
  "sleepSchedule": "night-owl",
  "noiseLevel": 3,
  "guestPolicy": "sometimes",
  "smoking": "no",
  "pets": "love"
}
```

**All fields are optional.** Undefined fields are stripped before save. `onboardingCompleted` is automatically set to `true`.

**Logic:**
1. Extract all known fields from `req.body`
2. Remove `undefined` entries
3. If profile exists → `prisma.profile.update()`
4. If not → `prisma.profile.create()` with `userId`

**Response (200):** Updated/created Profile object (same schema as GET)

---

## 4. Preferences Module

### `GET /preferences/me`

Get the authenticated user's matching preferences.

**Auth**: Required  
**Response (200):**
```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c0f",
  "userId": "665f1a2b3c4d5e6f7a8b9c0d",
  "genderPreference": "any",
  "minBudget": 1200,
  "maxBudget": 2000,
  "city": "San Francisco",
  "cleanliness": 4,
  "sleepSchedule": 3,
  "smoking": false,
  "drinking": true,
  "pets": true,
  "socialLevel": 4,
  "weightCleanliness": 30,
  "weightSleep": 25,
  "weightHabits": 20,
  "weightSocial": 25,
  "createdAt": "2026-03-20T10:30:00.000Z",
  "updatedAt": "2026-03-20T10:35:00.000Z"
}
```

Returns `null` if no preferences set yet.

---

### `POST /preferences/me`

Create or update preferences. Validates that weights sum to 100.

**Auth**: Required  
**Request Body:**
```json
{
  "genderPreference": "any",
  "minBudget": 1200,
  "maxBudget": 2000,
  "city": "San Francisco",
  "cleanliness": 4,
  "sleepSchedule": 3,
  "smoking": false,
  "drinking": true,
  "pets": true,
  "socialLevel": 4,
  "weightCleanliness": 30,
  "weightSleep": 25,
  "weightHabits": 20,
  "weightSocial": 25
}
```

**Validation:**
```
weightCleanliness + weightSleep + weightHabits + weightSocial === 100
```
If not → returns `400 { error: "Weights must sum to 100" }`

**Response (200):** Updated/created Preference object

---

## 5. Matching Module

### `GET /matching/me`

Compute compatibility scores for the authenticated user against all other eligible users.

**Auth**: Required  
**Onboarding Gate**: Profile + preferences must exist and `onboardingCompleted` must be `true`.

**Error Responses:**
- `403 { "message": "Onboarding completion is required" }` — Onboarding is incomplete

**Response (200):**
```json
[
  { "userId": "665f...001", "score": 87 },
  { "userId": "665f...002", "score": 72 },
  { "userId": "665f...003", "score": 65 }
]
```

Sorted by score descending.

**Algorithm:** See `docs/matching-algorithm.md` for full details.

---

## 6. Discovery Module

### `GET /discovery/feed`

Get the discovery feed — ranked potential roommates excluding already-swiped users.

Compatibility contract:
- Canonical route: `GET /discovery/feed`
- Legacy alias: `GET /discovery` (same handler, kept for backward compatibility)

**Auth**: Required  
**Onboarding Gate**: Profile + preferences must exist and `onboardingCompleted` must be `true`.

**Error Responses:**
- `403 { "message": "Onboarding completion is required" }` — Onboarding is incomplete

**Response (200):**
```json
[
  {
    "id": "665f...001",
    "name": "Sarah Mitchell",
    "age": 26,
    "gender": "female",
    "occupation": "UX Designer",
    "city": "San Francisco",
    "hasRoom": true,
    "photos": ["https://..."],
    "compatibility": 87,
    "budgetMin": 1200,
    "budgetMax": 2000,
    "tags": ["Has Room", "Non-Smoker", "Clean & Tidy", "UX Designer"]
  }
]
```

**Logic:**
1. Get all swipes by current user → `excludedUserIds`
2. Run matching algorithm → ranked scores
3. Filter out already-swiped users
4. Enrich each candidate with profile, preference, and auto-generated tags
5. Return array (sorted by compatibility score, descending)

**Tag generation rules:**
- `hasRoom === true` → "Has Room"
- `pets === true` → "Pet Friendly"
- `smoking === false` → "Non-Smoker"
- `cleanliness >= 4` → "Clean & Tidy"
- `socialLevel >= 4` → "Social"
- `socialLevel <= 2` → "Quiet"
- `sleepSchedule <= 2` → "Early Bird"
- `sleepSchedule >= 4` → "Night Owl"
- `occupation` → added as tag if present
- Maximum 4 tags returned

---

### `POST /discovery/swipe`

Record a swipe action on a potential roommate.

Compatibility contract:
- Canonical route: `POST /discovery/swipe`
- Legacy alias: `POST /matches/connect/:toUserId` (maps to a `like` action)

**Auth**: Required  
**Onboarding Gate**: Profile + preferences must exist and `onboardingCompleted` must be `true`.

**Error Responses:**
- `403 { "message": "Onboarding completion is required" }` — Onboarding is incomplete

**Request Body:**
```json
{
  "toUserId": "665f...001",
  "action": "like"       // "like" | "dislike" | "skip" | "superlike"
}
```

**Action normalization:**
- `"superlike"` → stored as `"like"`
- `"skip"` → stored as `"dislike"`

**Logic:**
1. Upsert `Swipe` record (fromUserId, toUserId)
2. If action is `"like"`:
   a. Check for reverse swipe (toUser liked fromUser)
   b. If mutual like → create Match + return `{ swipe, matched: true }`
3. Return `{ success: true }`

**Response (200):**
```json
{ "success": true }
```

Alias response note:
- `POST /matches/connect/:toUserId` returns `{ "success": true, "matched": boolean }`
- `POST /discovery/swipe` currently returns `{ "success": true }` while still creating a match on mutual likes.

---

## 7. Matches Module

### `GET /matches/me`

Get all confirmed matches for the authenticated user with enriched data.

**Auth**: Required  
**Onboarding Gate**: Profile + preferences must exist and `onboardingCompleted` must be `true`.

**Error Responses:**
- `403 { "message": "Onboarding completion is required" }` — Onboarding is incomplete

**Response (200):**
```json
[
  {
    "id": "665f...match001",
    "matchedAt": "2026-03-20T10:30:00.000Z",
    "createdAt": "2026-03-20T10:30:00.000Z",
    "otherUser": {
      "id": "665f...001",
      "name": "Sarah Mitchell",
      "age": 26,
      "gender": "female",
      "occupation": "UX Designer",
      "city": "San Francisco",
      "hasRoom": true,
      "photos": ["https://..."],
      "budgetMin": 1200,
      "budgetMax": 2000,
      "tags": ["Has Room", "Non-Smoker", "UX Designer"]
    },
    "compatibility": 85,
    "lastMessage": "Saturday at 2pm sounds great!",
    "conversationId": "665f...convo001"
  }
]
```

**Logic:**
1. Find all Match records where `userAId == userId OR userBId == userId`
2. For each match, determine the "other" user
3. Fetch the other user's profile, preference, and last conversation message
4. Generate tags (same algorithm as discovery, max 3)
5. Return sorted by `createdAt` descending

**Note:** `compatibility` is computed dynamically from the matching service.

---

## 8. Chat Module

### `GET /chat/:matchId`

Open a chat conversation for a specific match. Creates the conversation if it doesn't exist.

**Auth**: Required  
**URL Params:** `matchId` — the Match document ID

**Access Control:** Validates that the authenticated user is a participant in the match (`userAId` or `userBId`).

**Response (200):**
```json
{
  "conversation": {
    "id": "665f...convo001",
    "matchId": "665f...match001",
    "createdAt": "2026-03-20T10:30:00.000Z"
  },
  "messages": [
    {
      "id": "665f...msg001",
      "conversationId": "665f...convo001",
      "senderId": "665f...user001",
      "content": "Hey! I saw your profile!",
      "createdAt": "2026-03-20T10:31:00.000Z"
    }
  ],
  "otherUser": {
    "id": "665f...user002",
    "name": "Sarah Mitchell",
    "picture": "https://...",
    "city": "San Francisco",
    "occupation": "UX Designer"
  }
}
```

**Error Responses:**
- `400` — Missing matchId or userId
- `403` — User is not part of this match
- `404` — Match not found

---

## 9. Socket.IO Events (Real-Time Chat)

### Connection

```javascript
const socket = io("http://localhost:4000");
```

### Client → Server Events

| Event | Payload | Description |
|---|---|---|
| `joinRoom` | `conversationId: string` | Join a conversation room |
| `sendMessage` | `{ conversationId, senderId, content }` | Send a message |

### Server → Client Events

| Event | Payload | Description |
|---|---|---|
| `message` | `{ id, senderId, content, createdAt, timestamp }` | New message broadcast |

Payload contract notes:
- `createdAt` and `timestamp` are both ISO datetime strings.
- Both fields represent the same persisted message creation time.

### Message Flow

```
Client A sends:
  socket.emit('sendMessage', { conversationId, senderId, content })
    → Server receives, persists to DB via prisma.message.create()
    → Server broadcasts: io.to(conversationId).emit('message', payload)
```

---

## 10. Error Response Format

All error responses follow this pattern:

```json
{
  "error": "Error type",
  "message": "Human-readable description"
}
```

Or the simpler format used by most modules:

```json
{
  "message": "Error description"
}
```

### Common HTTP Status Codes

| Status | Meaning | When Used |
|---|---|---|
| 200 | OK | Successful request |
| 400 | Bad Request | Invalid input, missing required fields, weight validation |
| 401 | Unauthorized | Missing/invalid JWT, no userId in request |
| 403 | Forbidden | User not authorized for this resource (e.g., wrong match) |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded (100 req / 15 min) |
| 500 | Internal Server Error | Unhandled server error |

---

## 11. Rate Limiting

```
Window: 15 minutes
Max Requests: 100 per window
Headers: Standard (RateLimit-*)
Response on exceed:
  429 { "error": "Too many requests, please try again later." }
```
