# Flately Frontend Guide

Last updated: 2026-04-06
Status: Current implementation reference

## 1. Scope

This document describes the current frontend implementation in detail.
It is intended for developers who need to run, maintain, or extend the frontend without guessing behavior.

Primary flow reference:
- docs/product-user-flow.md

Backend/API reference:
- docs/api-reference.md

Full project handoff:
- docs/complete-implementation-handoff.md

## 2. Frontend Stack

- React 19
- TypeScript 5
- Vite 7
- Redux Toolkit
- React Router v6
- Native Fetch (Adapter + Strategy transport layer)
- Socket.IO client
- Tailwind CSS v4

Frontend root directory:
- frontend/

## 3. Source Tree (Current)

```text
frontend/
  index.html
  package.json
  tsconfig.json
  tsconfig.node.json
  vite.config.ts
  vitest.config.ts
  src/
    main.tsx
    index.css
    app/
      AppLayout.tsx
      hooks.ts
      ProtectedRoute.tsx
      router.tsx
      store.ts
    config/
      runtimeConfig.ts
    features/
      auth/
        AuthBootstrap.tsx
        AuthProvider.tsx
        auth.storage.ts
        authSlice.ts
      preauth/
        PreAuthQuestionnairePage.tsx
        preauth.storage.ts
      onboarding/
        OnboardingPage.tsx
        onboarding.mapper.ts
        onboarding.mapper.test.ts
      dashboard/
        DashboardPage.tsx
      discovery/
        DiscoveryPage.tsx
      matches/
        MatchesPage.tsx
      chat/
        ChatPage.tsx
        chat.messages.ts
        chat.messages.test.ts
        chat.socket.ts
      profile/
        ProfilePhotoManager.tsx
        ProfileEditorPage.tsx
        profileSlice.ts
    pages/
      LandingPage.tsx
      LoginPage.tsx
      SignupPage.tsx
    services/
      api.ts
      auth.transport.ts
      profile.transport.ts
      preferences.transport.ts
      discovery.transport.ts
      matches.transport.ts
      chat.transport.ts
      cloudinary.ts
      transports.test.ts
    types/
      index.ts
```

## 4. Runtime Configuration

File: src/config/runtimeConfig.ts

Default values:
- apiBaseUrl: http://localhost:4000
- socketUrl: http://localhost:4000
- cloudinaryCloudName: empty
- cloudinaryUploadPreset: empty

Optional environment variables:
- VITE_API_BASE_URL
- VITE_SOCKET_URL
- VITE_CLOUDINARY_CLOUD_NAME
- VITE_CLOUDINARY_UPLOAD_PRESET

## 5. App Boot Sequence

File: src/main.tsx

Boot order:
1. Redux Provider
2. AuthProvider
3. AuthBootstrap
4. RouterProvider

Why this order matters:
- AuthProvider restores session and configures token/unauthorized handlers.
- AuthBootstrap fetches profile context for route guard decisions.
- Router receives ready auth/profile state before protected pages render.

## 6. Routing and Guard Model

File: src/app/router.tsx

Public routes:
- /
- /start
- /signup
- /login
- /auth/callback

Protected routes:
- /app
- /app/onboarding
- /app/discover
- /app/matches
- /app/chat/:matchId?
- /app/profile

Catch-all:
- * -> /

### Sidebar navigation pattern (applied)

Files:
- src/app/routes.ts
- src/app/AppLayout.tsx

Pattern used:
- Single Source of Truth + Command-style navigation

Why it was applied:
- The app uses React Router, so sidebar interactions should always stay in SPA navigation.
- Link-style rendering can still behave like browser navigation under some user interactions and environments.

How it works now:
1. All app route paths and sidebar targets are defined centrally in `src/app/routes.ts`.
2. Sidebar items are rendered from configuration (`SIDEBAR_NAV_ITEMS`) rather than hardcoded strings.
3. Sidebar clicks execute `navigate(path)` commands from React Router instead of relying on anchor navigation semantics.
4. Active-state logic is route-aware (`/app` exact match, nested routes by prefix) to keep highlighting consistent.

Result:
- Sidebar route changes remain in-app and predictable.
- Route drift risk is reduced because router and navigation pull from the same route registry.

### Centralized routing system (applied across feature pages)

Files:
- src/app/routes.ts
- src/app/router.tsx
- src/app/AppLayout.tsx
- src/app/ProtectedRoute.tsx
- src/pages/LandingPage.tsx
- src/pages/LoginPage.tsx
- src/pages/SignupPage.tsx
- src/pages/GoogleAuthCallbackPage.tsx
- src/features/preauth/PreAuthQuestionnairePage.tsx
- src/features/onboarding/OnboardingPage.tsx
- src/features/dashboard/DashboardPage.tsx
- src/features/matches/MatchesPage.tsx
- src/features/chat/ChatPage.tsx
- src/features/auth/AuthProvider.tsx
- src/features/auth/authContinuationResolver.ts

What is centralized:
1. Static paths are stored in ROUTES.
2. Child route segments are stored in APP_CHILD_ROUTE_SEGMENTS.
3. Sidebar destinations are stored in SIDEBAR_NAV_ITEMS.
4. Dynamic routes use builders (example: buildAppChatPath(matchId)).
5. Query-string navigation uses a shared helper (buildPathWithQuery).

Operational rule:
- UI code must not hardcode app path strings directly.
- New navigation should reference route constants/builders from src/app/routes.ts.

Benefits observed:
- In-app navigation behavior is consistent across sidebar, page CTAs, redirects, and auth continuation.
- Refactors become safer because path changes happen in one place.
- Tests can assert against route constants instead of duplicated literals.

### Guard behavior

File: src/app/ProtectedRoute.tsx

Rules:
1. If auth is loading: show checking state.
2. If unauthenticated: redirect to /login.
3. If allowIncompleteProfile=true (onboarding route): allow entry.
4. If profile bootstrap failed: show retry block.
5. If profile not initialized/loading: show loading state.
6. If profile missing or onboardingCompleted is false: redirect to /app/onboarding.
7. Otherwise: allow protected content.

## 7. Auth Lifecycle

Files:
- src/features/auth/AuthProvider.tsx
- src/features/auth/authSlice.ts
- src/features/auth/auth.storage.ts
- src/features/auth/AuthBootstrap.tsx

Session model:
- accessToken + user persisted in localStorage
- storage key: flately.auth.session.v1

Auth flow:
1. AuthProvider reads persisted session.
2. If session exists:
   - dispatch setSession
  - register token getter for shared API client
3. If no session:
   - dispatch finishAuthBootstrap (unauthenticated)
4. 401 interceptor (non-auth endpoints):
   - clear persisted session
   - clear auth state
   - redirect to /login?reason=session-expired
5. AuthBootstrap loads profile using getMyProfile.

Login/Signup pages:
- src/pages/LoginPage.tsx
- src/pages/SignupPage.tsx
- src/pages/GoogleAuthCallbackPage.tsx

Behavior:
- source=questionnaire query param shows questionnaire continuation message.
- Continue with Google button starts backend OAuth flow via /auth/google/start.
- OAuth callback exchanges one-time code through /auth/google/exchange and persists standard auth session.
- all auth entry points use a unified continuation policy resolver in `src/features/auth/authContinuationResolver.ts`.

Auth continuation routing contract:
- source=questionnaire -> `/app/onboarding` for signup, login, and Google callback.
- signup without questionnaire source -> `/app/onboarding`.
- login and Google callback without questionnaire source -> `/app`.

Design pattern applied:
- Strategy: continuation rules are encapsulated as strategies and evaluated in priority order.
- Current strategies:
  - `QuestionnaireSourceStrategy`
  - `SignupDefaultStrategy`
  - `DefaultAppStrategy`

Related routing design patterns used in the app:
1. Registry pattern
  - Route definitions are centralized in src/app/routes.ts and shared by router and UI consumers.
2. Command pattern
  - Sidebar actions issue navigate(path) commands instead of relying on anchor-link behavior.
3. Strategy pattern
  - Auth continuation destination is resolved by ordered strategies in authContinuationResolver.

How to apply these patterns for any new route feature:
1. Add the new route constant (and segment if needed) in src/app/routes.ts.
2. Add dynamic path builder functions if the route requires params.
3. Wire router.tsx to consume those constants/segments only.
4. Replace all Link/Navigate/navigate call sites to use constants/builders.
5. Add or update tests to assert constants from routes.ts rather than string literals.
6. Update this guide section when introducing a new navigation policy.

## 8. Pre-Auth Questionnaire Handoff

Files:
- src/features/preauth/PreAuthQuestionnairePage.tsx
- src/features/preauth/preauth.storage.ts

Purpose:
- Collect baseline housing and preference signals before account creation.

Draft persistence:
- sessionStorage
- schema-validates enum and numeric ranges before use
- corrupted state is discarded automatically

Handoff:
- questionnaire -> /signup?source=questionnaire or /login?source=questionnaire
- onboarding now applies questionnaire draft safely by segment:
  - profile-derived fields are filled from draft only when profile data is missing
  - preference-derived fields are filled from draft only when preference data is missing
  - existing saved profile/preference values are not overwritten by questionnaire draft

## 9. Onboarding System

Files:
- src/features/onboarding/OnboardingPage.tsx
- src/features/onboarding/onboarding.mapper.ts

Flow:
1. Load profile + preferences.
2. If onboarding already complete: redirect to /app.
3. Map server state into form model via mapper.
4. Optionally merge questionnaire draft.
5. Validate per-step before advance (step 1 requires at least one photo).
6. Submit profile and preferences payloads.
7. Clear questionnaire draft.
8. Dispatch profile state and navigate /app.

Photo UX contract:
- Shared photo manager UI provides a button-first upload flow.
- Manual URL photo entry is removed from onboarding.
- First photo is primary; users can promote any image to primary.

Data safety in mapper:
- enum sanitization (fallback to allowed values)
- numeric clamping for bounded fields
- priority order sanitization

Completion gate:
- Profile payload sets onboardingCompleted=true on final submit.

## 10. Feature Pages

### 10.1 Dashboard

File: src/features/dashboard/DashboardPage.tsx

Data loaded concurrently:
- preferences
- matches
- discovery feed

Outputs:
- primary profile image card with direct edit CTA
- completion blockers
- profile completion percentage
- pool health summary
- next best action CTA
- preference signal summary (budget/city/gender preference/weights)

### 10.2 Discovery

File: src/features/discovery/DiscoveryPage.tsx

Uses:
- GET /discovery/feed
- POST /discovery/swipe

Behavior:
- queue + detail panel
- pass action sends dislike
- connect action sends like
- result notice includes match confirmation when returned

### 10.3 Matches

File: src/features/matches/MatchesPage.tsx

Uses:
- GET /matches/me

Behavior:
- table listing mutual matches
- click row or button routes to /app/chat/:matchId

### 10.4 Chat

File: src/features/chat/ChatPage.tsx

Uses:
- GET /matches/me (thread list)
- GET /chat/:matchId (conversation bootstrap)
- Socket joinRoom + sendMessage
- Receives message events

Behavior:
- connection status badge: connected/reconnecting/connecting/disconnected
- send disabled unless socket connected and message non-empty

### 10.5 Profile Editor

File: src/features/profile/ProfileEditorPage.tsx

Tabs:
- My Profile
- Preferences

Photo management:
- Shared photo manager supports upload/remove/set-primary controls.
- Photo changes persist through existing `POST /profiles/me` payload (`photos: string[]`).

Validation:
- profile: name/city required
- preferences: maxBudget >= minBudget
- preferences weights must total 100

## 11. API Transport Layer

Files: src/services/*.ts

Core client:
- src/services/api.ts

Features:
- Replaced Axios transport with Adapter + Strategy in `api.ts`
- Kept existing service call contract unchanged, so feature modules still call `apiRequest(...)`
- Preserved auth token injection and one-shot 401 unauthorized handling behavior
- Added a structured manual error model (`ApiError`) so existing UI error mapping still works

Pattern fit:
- Strategy: `FetchRequestStrategy` handles low-level HTTP execution
- Adapter: `HttpClientAdapter` adapts app-level request config to the strategy and centralizes cross-cutting auth behavior

Transport endpoint map:
- auth.transport.ts
  - POST /auth/login
  - POST /auth/signup
  - GET /users/me
- profile.transport.ts
  - GET /profiles/me
  - POST /profiles/me
- preferences.transport.ts
  - GET /preferences/me
  - POST /preferences/me
- discovery.transport.ts
  - GET /discovery/feed
  - POST /discovery/swipe
- matches.transport.ts
  - GET /matches/me
  - POST /matches/connect/:toUserId
- chat.transport.ts
  - GET /chat/:matchId

## 12. Onboarding-Gated Backend Contract

Frontend expectation:
- Before onboarding completion, matching/discovery/matches endpoints return HTTP 403 with:
  - {"message":"Onboarding completion is required"}

Frontend reaction:
- Route guard keeps incomplete users in /app/onboarding.
- If a direct API call still receives 403, error surfaces in page error state and user can retry after completing onboarding.

## 13. Redux State Model

Store file:
- src/app/store.ts

Slices:
- auth
  - status: loading | authenticated | unauthenticated
  - accessToken
  - user
  - error
- profile
  - data
  - loading
  - error
  - initialized

## 14. Styling System

File: src/index.css

Theme direction:
- light, high-readability command-center style
- custom colors via Tailwind v4 theme tokens
- reusable border/surface/canvas scale used across all feature pages

## 15. Cloudinary Integration

File: src/services/cloudinary.ts

Behavior:
- requests signed upload config from backend `POST /uploads/signature` first
- if backend returns `CLOUDINARY_NOT_CONFIGURED` or route is unavailable, falls back to unsigned preset upload
- if neither signed config nor unsigned preset config is available: throws Cloudinary is not configured
- onboarding gracefully supports manual image URL entry as fallback

## 16. Testing and Verification

Frontend test files:
- src/features/chat/chat.messages.test.ts
- src/features/onboarding/onboarding.mapper.test.ts
- src/features/auth/authContinuationResolver.test.ts
- src/services/transports.test.ts
- e2e/onboarding-cloudinary.spec.ts

Commands:
```bash
cd frontend
npm run test
npm run test:e2e
npm run typecheck
npm run lint
npm run build
```

Latest verified status (2026-04-06):
- tests: pass
- e2e: pass
- typecheck: pass
- lint: pass
- build: pass

## 17. Local Development Runbook

1. Start backend:
```bash
cd backend
npm run dev
```

2. Start frontend:
```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5174
```

3. Open app:
- http://localhost:5174

4. Smoke path:
- /start -> /signup -> /app/onboarding -> /app -> /app/discover -> /app/matches -> /app/chat -> /app/profile

## 18. Maintenance Rules

1. Keep docs/product-user-flow.md and this file in sync whenever guard/route behavior changes.
2. Keep Auth0 out of runtime UI and use only backend-managed Google OAuth + email/password auth.
3. Do not bypass onboarding gate for discovery/matches/chat routes.
4. Keep transport contracts aligned with docs/api-reference.md before release.
