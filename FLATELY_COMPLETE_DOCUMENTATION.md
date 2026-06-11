# 🏠 Flately - Complete Technical Documentation

> Note: This file includes historical snapshots from earlier architecture phases.
> Historical sections may reference legacy Auth0 and JavaScript-era file names; treat those as archival unless confirmed in current docs.
> Archive boundary guide: [docs/historical-archive.md](docs/historical-archive.md).
> For current production flow and auth behavior, use `docs/product-user-flow.md` and `docs/frontend-guide.md` as source of truth.
> Latest runtime QA evidence for manual-auth flow is documented in `docs/manual-auth-end-to-end-verification.md`.
> Full implementation handoff for new developers is documented in `docs/complete-implementation-handoff.md`.

> **Version:** 1.0.0  
> **Last Updated:** February 3, 2026  
> **Purpose:** Tinder-like roommate matching application  
> **Status:** MVP Complete - Production Ready

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Getting Started](#4-getting-started)
5. [Backend Deep Dive](#5-backend-deep-dive)
6. [Frontend Deep Dive](#6-frontend-deep-dive)
7. [Database Schema](#7-database-schema)
8. [API Reference](#8-api-reference)
9. [Authentication Flow](#9-authentication-flow)
10. [Real-time Chat](#10-real-time-chat)
11. [Matching Algorithm](#11-matching-algorithm)
12. [Styling System](#12-styling-system)
13. [State Management](#13-state-management)
14. [Component Library](#14-component-library)
15. [Testing & Demo Data](#15-testing--demo-data)
16. [Deployment](#16-deployment)
17. [File Structure](#17-file-structure)

---

## 1. Project Overview

### What is Flately?

Flately is a **modern roommate-finding application** that works like Tinder for roommates. Users create profiles, set preferences, and swipe to find compatible people to live with.

### Core Features

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | Manual email/password with JWT tokens |
| 👤 **Profiles** | Age, occupation, city, photos, lifestyle |
| 🎯 **Preferences** | Budget, cleanliness, sleep schedule, habits |
| 🔍 **Discovery** | Swipeable cards with compatibility scores |
| ❤️ **Matching** | Mutual likes create matches |
| 💬 **Real-time Chat** | Socket.io messaging between matches |
| 📊 **Dashboard** | Stats, quick actions, recent matches |

### User Journey

```
1. Landing Page -> Questionnaire -> Login/Signup
        ↓
2. Onboarding (5 steps)
   - Basic Info (name, age, gender)
   - Lifestyle (sleep, cleanliness)
   - Preferences (roommate criteria)
   - Budget (min/max rent)
   - Photos (profile pictures)
        ↓
3. Dashboard (stats, quick actions)
        ↓
4. Discovery (swipe left/right)
        ↓
5. Matches (mutual likes)
        ↓
6. Chat (real-time messaging)
```

---

## 2. Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React 19 + Vite + Tailwind v4 + Redux + Framer Motion      │
│                    Port: 5173                                │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP/REST + WebSocket
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│          Express.js + Socket.io + Prisma ORM                │
│                    Port: 4000                                │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌─────────────────┐    ┌─────────────────────┐
│   MongoDB       │    │      Auth0          │
│   Atlas         │    │   (OAuth2/JWT)      │
└─────────────────┘    └─────────────────────┘

```

### Data Flow

```
User Action → React Component → Redux Action → API Request
                                                   ↓
                                            Express Route
                                                   ↓
                                          Auth0 Middleware
                                                   ↓
                                            Controller
                                                   ↓
                                              Service
                                                   ↓
                                          Prisma/MongoDB
                                                   ↓
                                         Response → Redux State → UI Update
```

---

## 3. Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.3 | UI Framework |
| **Vite** | 7.2.4 | Build Tool |
| **Tailwind CSS** | 4.1.18 | Styling (v4 with @theme) |
| **Redux Toolkit** | 2.11.2 | State Management |
| **Framer Motion** | 12.29.2 | Animations |
| **React Router** | 6.28.0 | Routing |
| **Auth0 React** | 2.11.0 | Authentication |
| **Axios** | 1.13.2 | HTTP Client |
| **Socket.io Client** | 4.8.3 | Real-time Communication |
| **React Hook Form** | 7.71.1 | Form Management |
| **Zod** | 4.3.5 | Schema Validation |
| **Lucide React** | 0.563.0 | Icons |
| **Radix UI** | Various | Accessible Components |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime |
| **Express** | 5.2.1 | Web Framework |
| **Prisma** | 6.19.1 | ORM |
| **MongoDB** | Atlas | Database |
| **Socket.io** | 4.8.3 | WebSockets |
| **Auth0 JWT** | 1.7.3 | JWT Validation |
| **Helmet** | 8.1.0 | Security Headers |
| **express-rate-limit** | 8.2.1 | Rate Limiting |

---

## 4. Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- MongoDB Atlas account
- Auth0 account

### Environment Setup

#### Backend `.env`
```bash
# /backend/.env
PORT=4000
DATABASE_URL="mongodb+srv://<user>:<pass>@cluster.mongodb.net/flately"
AUTH0_DOMAIN=dev-xxx.us.auth0.com
AUTH0_AUDIENCE=http://localhost:4000
FRONTEND_URL=http://localhost:5173
```

#### Frontend (hardcoded in main.jsx)
```javascript
// Auth0 Config
domain: "dev-aobtnrv6g50bmj1a.us.auth0.com"
clientId: "2Pz3Q6dir2WRg5lDLW8ucrmo3HG92cOR"
audience: "http://localhost:4000"
```

### Installation

```bash
# Clone repository
git clone <repo-url>
cd flately-full_stack

# Backend setup
cd backend
npm install
npx prisma generate
npm run seed  # Optional: Add synthetic Indian demo data

# Frontend setup
cd ../frontend/frontend
npm install
```

### Running the Application

```bash
# Terminal 1: Backend
cd backend
npm start  # Runs on port 4000

# Terminal 2: Frontend
cd frontend/frontend
npm run dev  # Runs on port 5173
```

### Available Scripts

#### Backend
| Command | Description |
|---------|-------------|
| `npm start` | Start with nodemon |
| `npm run dev` | Same as start |
| `npm run seed` | Create idempotent synthetic Indian demo data (12 users) |
| `npm run seed:reset` | Reserved reset script (currently passes --reset to same seed flow) |

#### Frontend
| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run preview` | Preview production build |

---

## 5. Backend Deep Dive

### Directory Structure

```
backend/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Demo data generator
├── src/
│   ├── app.js             # Express app configuration
│   ├── server.js          # HTTP server + Socket.io
│   ├── config/
│   │   ├── env.js         # Environment variables
│   │   └── prisma.js      # Prisma client singleton
│   ├── middlewares/
│   │   └── auth0.middleware.js  # JWT validation
│   └── modules/
│       ├── users.*.js     # User CRUD
│       ├── profiles/      # Profile management
│       ├── preferences/   # User preferences
│       ├── discovery/     # Discovery feed & swiping
│       ├── matching/      # Compatibility algorithm
│       ├── matches/       # Match management
│       └── chat/          # Real-time messaging
```

### Express App Configuration (`app.js`)

```javascript
const express = require("express");
const cors = require("cors");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

// Rate limiting (100 req/15min)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);
app.use(express.json());

// Routes
app.use("/profiles", profileRoutes);
app.use("/preferences", preferenceRoutes);
app.use("/discovery", discoveryRoutes);
app.use("/matches", matchRoutes);
app.use("/chat", chatRoutes);
app.use("/users", userRoutes);
app.use("/matching", matchingRoutes);

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));
```

### Server with Socket.io (`server.js`)

```javascript
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const registerChatSocket = require("./modules/chat/chat.socket");

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

registerChatSocket(io);

server.listen(process.env.PORT || 4000);
```

### Auth0 Middleware

```javascript
const { auth } = require('express-oauth2-jwt-bearer');

// JWT verification
const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`,
  tokenSigningAlg: 'RS256'
});

// Extract user ID from token
const attachUserId = (req, res, next) => {
  if (req.auth?.payload) {
    req.userId = req.auth.payload.sub;
  }
  next();
};

module.exports = [checkJwt, attachUserId];
```

---

## 6. Frontend Deep Dive

### Directory Structure

```
frontend/frontend/
├── public/
├── src/
│   ├── main.jsx           # App entry, Auth0 provider
│   ├── index.css          # Tailwind v4 theme
│   ├── app/
│   │   ├── router.jsx     # React Router config
│   │   ├── store.js       # Redux store
│   │   ├── AppLayout.jsx  # Dashboard layout
│   │   └── ProtectedRoute.jsx  # Auth guard
│   ├── components/
│   │   ├── common/        # Shared components
│   │   ├── layout/        # Navbar, Sidebar
│   │   └── ui/            # Button, Card, Input, etc.
│   ├── features/
│   │   ├── auth/          # AuthSync, authSlice
│   │   ├── chat/          # ChatPage, socket
│   │   ├── dashboard/     # DashboardPage
│   │   ├── discovery/     # DiscoveryPage, swipe cards
│   │   ├── matches/       # MatchesPage
│   │   ├── onboarding/    # 5-step wizard
│   │   └── preferences/   # PreferencesPage
│   ├── pages/
│   │   ├── Landing.jsx    # Public homepage
│   │   └── NotFound.jsx   # 404 page
│   ├── services/
│   │   └── api.js         # Axios configuration
│   └── lib/
│       └── utils.js       # cn() for classnames
```

### Entry Point (`main.jsx`)

```jsx
import { Auth0Provider } from '@auth0/auth0-react';
import { Provider } from 'react-redux';
import { store } from './app/store';
import { router } from './app/router';
import AuthSync from './features/auth/AuthSync';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Auth0Provider
      domain="dev-aobtnrv6g50bmj1a.us.auth0.com"
      clientId="2Pz3Q6dir2WRg5lDLW8ucrmo3HG92cOR"
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: "http://localhost:4000"
      }}
    >
      <Provider store={store}>
        <AuthSync>
          <RouterProvider router={router} />
        </AuthSync>
      </Provider>
    </Auth0Provider>
  </StrictMode>
);
```

### Router Configuration

```jsx
export const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  {
    element: <AppLayout />,
    children: [
      { path: "/app", element: <ProtectedRoute><DashboardPage /></ProtectedRoute> },
      { path: "/app/onboarding", element: <ProtectedRoute><OnboardingPage /></ProtectedRoute> },
      { path: "/app/discover", element: <ProtectedRoute><DiscoveryPage /></ProtectedRoute> },
      { path: "/app/matches", element: <ProtectedRoute><MatchesPage /></ProtectedRoute> },
      { path: "/app/chat/:matchId?", element: <ProtectedRoute><ChatPage /></ProtectedRoute> },
    ]
  },
  { path: "*", element: <NotFound /> }
]);
```

### API Client (`services/api.js`)

```javascript
import axios from "axios";

const api = axios.create({
  baseURL: 'http://localhost:4000',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

export async function apiRequest(path, options = {}, getToken) {
  const token = await getToken();
  const response = await api({
    url: path,
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
}
```

---

## 7. Database Schema

### Prisma Schema (MongoDB)

```prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// User authentication identity
model User {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  email        String   @unique
  passwordHash String?
  googleId     String?
  name         String?
  picture      String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  profile      Profile?
}

// User profile information
model Profile {
  id                  String   @id @default(auto()) @map("_id") @db.ObjectId
  userId              String   @unique @db.ObjectId
  age                 Int
  gender              String
  occupation          String
  city                String
  hasRoom             Boolean
  onboardingCompleted Boolean  @default(false)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  user                User     @relation(fields: [userId], references: [id])
}

// Matching preferences
model Preference {
  id               String   @id @default(auto()) @map("_id") @db.ObjectId
  userId           String   @unique @db.ObjectId
  genderPreference String   // male | female | any
  minBudget        Int
  maxBudget        Int
  city             String
  cleanliness      Int      // 1-5 scale
  sleepSchedule    Int      // 1-5 scale
  smoking          Boolean
  drinking         Boolean
  pets             Boolean
  socialLevel      Int      // 1-5 scale
  weightCleanliness Int     // Weight for scoring
  weightSleep      Int
  weightHabits     Int
  weightSocial     Int
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

// Swipe actions
model Swipe {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  fromUserId String   @db.ObjectId
  toUserId   String   @db.ObjectId
  action     String   // "like" | "skip"
  createdAt  DateTime @default(now())
  @@unique([fromUserId, toUserId])
}

// Mutual matches
model Match {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  userAId   String   @db.ObjectId
  userBId   String   @db.ObjectId
  createdAt DateTime @default(now())
  @@unique([userAId, userBId])
}

// Chat conversations
model Conversation {
  id        String    @id @default(auto()) @map("_id") @db.ObjectId
  matchId   String    @unique @db.ObjectId
  createdAt DateTime  @default(now())
  messages  Message[]
}

// Chat messages
model Message {
  id             String       @id @default(auto()) @map("_id") @db.ObjectId
  conversationId String       @db.ObjectId
  senderId       String       @db.ObjectId
  content        String
  createdAt      DateTime     @default(now())
  conversation   Conversation @relation(fields: [conversationId], references: [id])
}
```

### Entity Relationships

```
User 1────1 Profile
User 1────1 Preference
User 1────* Swipe (as fromUser)
User *────* Match (as userA or userB)
Match 1────1 Conversation
Conversation 1────* Message
```

---

## 8. API Reference

### Authentication

All endpoints (except `/health`) require JWT token:

```
Authorization: Bearer <auth0_token>
```

### Endpoints

#### Profiles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profiles/me` | Get current user's profile |
| POST | `/profiles` | Create profile |
| PUT | `/profiles/me` | Update profile |

#### Preferences

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/preferences/me` | Get preferences |
| POST | `/preferences` | Create preferences |
| PUT | `/preferences/me` | Update preferences |

#### Discovery

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/discovery/feed` | Get swipeable profiles |
| POST | `/discovery/swipe` | Submit swipe action |

**Request Body for POST `/discovery/swipe`:**
```json
{
  "toUserId": "string",
  "action": "like" | "skip"
}
```

**Response from GET `/discovery/feed`:**
```json
[
  {
    "id": "userId",
    "name": "Sarah Mitchell",
    "age": 26,
    "gender": "female",
    "occupation": "UX Designer",
    "city": "San Francisco",
    "hasRoom": true,
    "photos": ["https://..."],
    "compatibility": 85,
    "budgetMin": 1200,
    "budgetMax": 2000,
    "tags": ["Has Room", "Non-Smoker", "Clean & Tidy"]
  }
]
```

#### Matches

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/matches/me` | Get all matches |

**Response:**
```json
[
  {
    "id": "matchId",
    "matchedAt": "2026-02-03T...",
    "otherUser": {
      "id": "userId",
      "name": "Alex Chen",
      "age": 28,
      "photos": ["https://..."],
      "city": "San Francisco",
      "tags": ["Software Engineer"]
    },
    "compatibility": 85,
    "lastMessage": "Hey! How's it going?",
    "conversationId": "convoId"
  }
]
```

#### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/chat/:matchId` | Get conversation & messages |

**Response:**
```json
{
  "conversation": { "id": "convoId", "matchId": "matchId" },
  "messages": [
    {
      "id": "msgId",
      "senderId": "userId",
      "content": "Hello!",
      "createdAt": "2026-02-03T..."
    }
  ],
  "otherUser": {
    "id": "userId",
    "name": "Alex Chen",
    "picture": "https://...",
    "city": "San Francisco"
  }
}
```

---

## 9. Authentication Flow

### Auth0 Configuration

```
Application Type: Single Page Application
Allowed Callback URLs: http://localhost:5173
Allowed Logout URLs: http://localhost:5173
Allowed Web Origins: http://localhost:5173
```

### Flow Diagram

```
1. User clicks "Get Started" → Auth0 Login Page
2. User authenticates → Auth0 redirects with code
3. Frontend exchanges code for tokens
4. AuthSync syncs user to Redux
5. API requests include Bearer token
6. Backend validates JWT with Auth0
7. Backend extracts userId from token
```

### Frontend Auth Sync

```jsx
// AuthSync.jsx
export default function AuthSync({ children }) {
  const { isAuthenticated, user, isLoading } = useAuth0();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        dispatch(setAuth(user));
      } else {
        dispatch(clearAuth());
      }
    }
  }, [isAuthenticated, user, isLoading, dispatch]);

  return children;
}
```

### Protected Routes

```jsx
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/" />;
  
  return children;
}
```

---

## 10. Real-time Chat

### Socket.io Setup

#### Backend (`chat.socket.ts`)

```javascript
function registerChatSocket(io) {
  io.on("connection", (socket) => {
    // Join conversation room
    socket.on("joinRoom", (conversationId) => {
      socket.join(conversationId);
    });

    // Handle sending messages
    socket.on("sendMessage", async ({ conversationId, senderId, content }) => {
      const msg = await chatService.sendMessage(conversationId, senderId, content);
      io.to(conversationId).emit("message", msg);
    });
  });
}
```

#### Frontend (`socket.js`)

```javascript
import { io } from "socket.io-client";
export const socket = io("http://localhost:4000");
```

#### Usage in ChatPage

```jsx
// Join conversation
useEffect(() => {
  if (conversationId) {
    socket.emit('joinRoom', conversationId);
  }
}, [conversationId]);

// Listen for new messages
useEffect(() => {
  const handleNewMessage = (msg) => {
    setMessages(prev => [...prev, msg]);
  };
  
  socket.on('message', handleNewMessage);
  return () => socket.off('message', handleNewMessage);
}, []);

// Send message
const handleSend = () => {
  socket.emit('sendMessage', {
    conversationId,
    senderId: user.sub,
    content: message
  });
  setMessage('');
};
```

---

## 11. Matching Algorithm

### Eligibility Checks (Hard Constraints)

```javascript
function isEligible(userA, userB) {
  // Same user
  if (userA.userId === userB.userId) return false;

  // City must match
  if (userA.city !== userB.city) return false;

  // Budget overlap
  if (userA.maxBudget < userB.minBudget || userB.maxBudget < userA.minBudget) {
    return false;
  }

  // Gender preference
  if (userA.genderPreference !== "any" && userA.genderPreference !== userB.gender) {
    return false;
  }
  if (userB.genderPreference !== "any" && userB.genderPreference !== userA.gender) {
    return false;
  }

  return true;
}
```

### Compatibility Score (0-100)

```javascript
function similarityScore(a, b, max = 5) {
  return 1 - Math.abs(a - b) / max;
}

function booleanScore(a, b) {
  return a === b ? 1 : 0;
}

function calculateScore(prefA, prefB) {
  const cleanliness = similarityScore(prefA.cleanliness, prefB.cleanliness) * prefA.weightCleanliness;
  const sleep = similarityScore(prefA.sleepSchedule, prefB.sleepSchedule) * prefA.weightSleep;
  const habits = ((booleanScore(prefA.smoking, prefB.smoking) + 
                   booleanScore(prefA.drinking, prefB.drinking)) / 2) * prefA.weightHabits;
  const social = similarityScore(prefA.socialLevel, prefB.socialLevel) * prefA.weightSocial;

  return Math.round(cleanliness + sleep + habits + social);
}
```

### Weight Configuration

Users set weights that sum to ~100:
- `weightCleanliness`: 15-40
- `weightSleep`: 15-35
- `weightHabits`: 15-25
- `weightSocial`: 15-35

---

## 12. Styling System

### Tailwind CSS v4 with @theme

The project uses **Tailwind CSS v4** with the new `@theme` directive for design tokens.

#### Color System (OKLCH)

```css
@theme {
  /* Primary - Indigo */
  --color-primary-50: oklch(0.98 0.01 265);
  --color-primary-500: oklch(0.55 0.22 265);
  --color-primary-600: oklch(0.48 0.22 265);

  /* Accent - Purple */
  --color-accent-500: oklch(0.60 0.22 300);

  /* Success - Emerald */
  --color-success-500: oklch(0.65 0.20 160);

  /* Warning - Amber */
  --color-warning-500: oklch(0.75 0.18 85);

  /* Error - Red */
  --color-error-500: oklch(0.60 0.22 25);

  /* Surfaces - Warm Grays */
  --color-surface-50: oklch(0.99 0.005 260);
  --color-surface-900: oklch(0.15 0.015 260);
}
```

#### Typography Scale

```css
@theme {
  --font-display: "Satoshi", "Inter", system-ui, sans-serif;
  --font-body: "Inter", system-ui, sans-serif;

  /* Fluid Typography */
  --text-fluid-base: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
  --text-fluid-xl: clamp(1.25rem, 1rem + 1vw, 1.5rem);
  --text-fluid-4xl: clamp(2.25rem, 1.5rem + 3vw, 3.5rem);
}
```

#### Animations

```css
@theme {
  /* Spring curves - NOT ease-in-out! */
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  --ease-spring-snappy: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1);
}
```

### Usage Classes

```html
<!-- Colors -->
<div class="bg-primary-500 text-white">Primary</div>
<div class="text-surface-600">Text</div>

<!-- Shadows -->
<div class="shadow-lg shadow-primary-500/25">Card</div>

<!-- Gradients (Tailwind v4 syntax) -->
<div class="bg-linear-to-r from-primary-500 to-accent-500">Gradient</div>
```

---

## 13. State Management

### Redux Store Configuration

```javascript
// store.js
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import onboardingReducer from "../features/onboarding/onboardingSlice";
import preferenceReducer from "../features/preferences/preferencesSlice";
import discoveryReducer from "../features/discovery/discoverySlice";
import matchesReducer from "../features/matches/matchesSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    onboarding: onboardingReducer,
    preferences: preferenceReducer,
    discovery: discoveryReducer,
    matches: matchesReducer
  }
});
```

### Slice Pattern

```javascript
// discoverySlice.js
import { createSlice } from "@reduxjs/toolkit";

const discoverySlice = createSlice({
  name: "discovery",
  initialState: { feed: [], loading: false },
  reducers: {
    start(state) {
      state.loading = true;
    },
    setFeed(state, action) {
      state.feed = action.payload;
      state.loading = false;
    },
    removeUser(state, action) {
      state.feed = state.feed.filter(u => u.userId !== action.payload);
    }
  }
});

export const { start, setFeed, removeUser } = discoverySlice.actions;
export default discoverySlice.reducer;
```

### Usage in Components

```jsx
import { useDispatch, useSelector } from 'react-redux';
import { start, setFeed } from './discoverySlice';

function DiscoveryPage() {
  const dispatch = useDispatch();
  const feed = useSelector(state => state.discovery.feed);

  useEffect(() => {
    async function loadFeed() {
      dispatch(start());
      const data = await apiRequest('/discovery/feed', {}, getAccessTokenSilently);
      dispatch(setFeed(data));
    }
    loadFeed();
  }, []);
}
```

---

## 14. Component Library

### Button Component

```jsx
// components/ui/Button.jsx
export const Button = forwardRef(({
  children,
  variant = 'primary',  // primary | secondary | outline | ghost | danger
  size = 'md',          // sm | md | lg
  loading,
  disabled,
  className,
  ...props
}, ref) => {
  return (
    <motion.button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-xl',
        'transition-colors duration-200',
        'focus:ring-2 focus:ring-primary-500/50',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {loading && <Loader2 className="animate-spin h-4 w-4" />}
      {children}
    </motion.button>
  );
});
```

### Card Component

```jsx
// components/ui/Card.jsx
export const Card = forwardRef(({
  children,
  hoverable = true,
  variant = 'default',  // default | elevated | glass | gradient
  className,
  ...props
}, ref) => {
  const Component = hoverable ? motion.div : 'div';

  return (
    <Component
      ref={ref}
      className={cn(
        'rounded-2xl border',
        'shadow-lg shadow-surface-900/5',
        hoverable && 'hover:shadow-xl',
        variants[variant],
        className
      )}
      whileHover={hoverable ? { y: -4, scale: 1.01 } : {}}
      {...props}
    >
      {children}
    </Component>
  );
});
```

### Input Component

```jsx
export const Input = forwardRef(({
  label,
  error,
  className,
  ...props
}, ref) => {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium">{label}</label>}
      <input
        ref={ref}
        className={cn(
          'w-full px-4 py-3 rounded-xl border-2',
          'bg-white text-surface-900',
          'focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10',
          error && 'border-error-500',
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-error-500">{error}</p>}
    </div>
  );
});
```

---

## 15. Testing & Demo Data

### Seed Script Usage

```bash
# Create/update 12 synthetic Indian demo users with matches and conversations
npm run seed

# Reserved reset script (currently passes --reset to same seed flow)
npm run seed:reset
```

### Demo Users

| Name | Email | Has Room | Gender | Occupation |
|------|-------|----------|--------|------------|
| Aarav Sharma | aarav.sharma@flately.demo | Yes | Male | Product Designer |
| Ananya Reddy | ananya.reddy@flately.demo | No | Female | Software Engineer |
| Vihaan Patel | vihaan.patel@flately.demo | Yes | Male | Finance Analyst |
| Isha Menon | isha.menon@flately.demo | No | Female | Marketing Manager |
| Kabir Verma | kabir.verma@flately.demo | Yes | Male | Consultant |
| Meera Nair | meera.nair@flately.demo | No | Female | Data Scientist |
| Raghav Singh | raghav.singh@flately.demo | No | Male | Founder |
| Sanya Khanna | sanya.khanna@flately.demo | Yes | Female | Lawyer |
| Aditya Joshi | aditya.joshi@flately.demo | No | Male | Student |
| Priya Iyer | priya.iyer@flately.demo | Yes | Female | HR Lead |
| Nikhil Desai | nikhil.desai@flately.demo | Yes | Male | Sales Manager |
| Kavya Gupta | kavya.gupta@flately.demo | No | Female | Content Creator |

### Pre-created Matches

```
Aarav ↔ Meera
Vihaan ↔ Sanya
Kabir ↔ Isha
Ananya ↔ Priya
Aditya ↔ Kavya
Raghav ↔ Nikhil
```

### Seed Script Details

```javascript
// Idempotent upsert behavior by unique email
await prisma.user.upsert({
  where: { email: 'aarav.sharma@flately.demo' },
  update: { ... },
  create: { ... },
})
```

---

## 16. Deployment

### Backend Deployment (Railway/Render)

```yaml
# Environment Variables
PORT=4000
DATABASE_URL=mongodb+srv://...
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://api.flately.com
FRONTEND_URL=https://flately.com
```

### Frontend Deployment (Vercel/Netlify)

```bash
# Build command
npm run build

# Output directory
dist

# Environment variables (or update main.jsx)
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=https://api.flately.com
VITE_API_URL=https://api.flately.com
```

### Auth0 Production Config

```
Allowed Callback URLs: https://flately.com
Allowed Logout URLs: https://flately.com
Allowed Web Origins: https://flately.com
```

---

## 17. File Structure

### Complete File Tree

```
flately-full_stack/
├── backend/
│   ├── index.js
│   ├── package.json
│   ├── .env                          # Environment variables
│   ├── prisma/
│   │   ├── schema.prisma             # Database schema
│   │   └── seed.ts                   # Demo data generator
│   └── src/
│       ├── app.js                    # Express configuration
│       ├── server.js                 # HTTP server + Socket.io
│       ├── config/
│       │   ├── env.js
│       │   └── prisma.js             # Prisma client
│       ├── middlewares/
│       │   └── auth0.middleware.js   # JWT validation
│       └── modules/
│           ├── users.controllers.js
│           ├── users.routes.js
│           ├── users.service.js
│           ├── chat/
│           │   ├── chat.controller.js
│           │   ├── chat.routes.js
│           │   ├── chat.service.js
│           │   └── chat.socket.js    # WebSocket handlers
│           ├── discovery/
│           │   ├── discovery.controller.js
│           │   ├── discovery.routes.js
│           │   └── discovery.service.js
│           ├── matches/
│           │   ├── matches.controller.js
│           │   ├── matches.routes.js
│           │   └── matches.service.js
│           ├── matching/
│           │   ├── matching.controller.js
│           │   ├── matching.routes.js
│           │   └── matching.service.js  # Compatibility algorithm
│           ├── preferences/
│           │   ├── preferences.controller.js
│           │   ├── preferences.routes.js
│           │   └── preferences.service.js
│           └── profiles/
│               ├── profiles.controller.js
│               ├── profiles.routes.js
│               └── profiles.service.js
│
└── frontend/
    └── frontend/
        ├── package.json
        ├── vite.config.js
        ├── eslint.config.js
        ├── index.html
        ├── public/
        └── src/
            ├── main.jsx              # Entry point
            ├── index.css             # Tailwind v4 @theme
            ├── app/
            │   ├── router.jsx        # React Router
            │   ├── store.js          # Redux store
            │   ├── AppLayout.jsx     # Dashboard layout
            │   └── ProtectedRoute.jsx
            ├── components/
            │   ├── common/
            │   │   └── Stepper.jsx
            │   ├── layout/
            │   │   ├── AppSidebar.jsx
            │   │   └── Navbar.jsx
            │   └── ui/
            │       ├── Button.jsx
            │       ├── Card.jsx
            │       ├── index.js
            │       ├── Input.jsx
            │       ├── NoiseLayer.jsx
            │       └── Skeleton.jsx
            ├── features/
            │   ├── auth/
            │   │   ├── authSlice.js
            │   │   └── AuthSync.jsx
            │   ├── chat/
            │   │   ├── ChatPage.jsx
            │   │   ├── ChatSlice.js
            │   │   └── socket.js
            │   ├── dashboard/
            │   │   └── DashboardPage.jsx
            │   ├── discovery/
            │   │   ├── discoveryPage.jsx
            │   │   └── discoverySlice.js
            │   ├── matches/
            │   │   ├── MatchesPage.jsx
            │   │   └── matchesSlice.js
            │   ├── onboarding/
            │   │   ├── OnboardingPage.jsx
            │   │   ├── onboardingSlice.jsx
            │   │   ├── ProfileForm.jsx
            │   │   └── steps/
            │   │       ├── BasicInfoStep.jsx
            │   │       ├── BudgetStep.jsx
            │   │       ├── LifestyleStep.jsx
            │   │       ├── PhotosStep.jsx
            │   │       └── PreferencesStep.jsx
            │   └── preferences/
            │       ├── PreferenceForm.jsx
            │       ├── PreferencesPage.jsx
            │       └── preferencesSlice.jsx
            ├── lib/
            │   └── utils.js          # cn() helper
            ├── pages/
            │   ├── Landing.jsx
            │   └── NotFound.jsx
            └── services/
                ├── api.js            # Axios client
                └── auth0.js
```

---

## 🎯 Quick Reference

### Commands Cheat Sheet

```bash
# Development
cd backend && npm start         # Backend on :4000
cd frontend/frontend && npm run dev  # Frontend on :5173

# Database
npm run seed                    # Add synthetic Indian demo data
npm run seed:reset              # Reserved reset script (currently passes --reset to same seed flow)
npx prisma studio              # Database GUI

# Build
npm run build                   # Production build
npm run lint                    # Check for errors
```

### Key Files to Edit

| What | File |
|------|------|
| Database schema | `backend/prisma/schema.prisma` |
| API routes | `backend/src/modules/*/routes.js` |
| Business logic | `backend/src/modules/*/service.js` |
| Auth config | `frontend/src/main.jsx` |
| Routes | `frontend/src/app/router.jsx` |
| State | `frontend/src/features/*/slice.js` |
| Styling | `frontend/src/index.css` |
| Components | `frontend/src/components/ui/` |

### API Quick Reference

```bash
GET  /health              # Health check
GET  /discovery/feed      # Get profiles to swipe
POST /discovery/swipe     # Swipe action
GET  /matches/me          # Get matches
GET  /chat/:matchId       # Get conversation
GET  /profiles/me         # Get profile
POST /profiles            # Create profile
```

---

## 📝 Notes

1. **JWT sessions** are issued by backend auth endpoints for both email/password and Google OAuth.
2. **Match IDs** are sorted (userAId < userBId) to prevent duplicates
3. **Demo data** is seeded idempotently via unique email keys.
4. **Tailwind v4** uses `@theme` directive instead of `tailwind.config.js`
5. **Socket.io** requires CORS configuration for cross-origin requests

---

**Built with ❤️ for finding perfect roommates**
