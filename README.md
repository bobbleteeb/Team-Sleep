# QuickBite: AI-Powered Food Delivery Platform

![Next.js](https://img.shields.io/badge/Next.js-16.1.x-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2.x-149eca?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e?logo=supabase)
![OpenAI](https://img.shields.io/badge/OpenAI-Integrated-10a37f?logo=openai)

QuickBite is a full-stack food delivery app where AI drives real product behavior.

Customers order with natural language, discover nearby food with location-aware recommendations, and place orders in a chat-first flow. Drivers use an AI copilot to generate clear, professional messages while managing live deliveries.

## What This App Does

- Customer and driver experiences in one platform
- AI-powered ordering assistant that can perform structured actions
- AI driver message copilot for ETA, delays, arrival, and contact issues
- Geolocation-based restaurant discovery with fallback data sources
- Real-time order messaging between customers and drivers
- Cart, checkout, promo discounts, and order history

## Why It Matters 

- End-to-end ownership: product UX, API design, data modeling, and AI integration
- Practical LLM orchestration: prompt design, JSON action extraction, and safe fallbacks
- Real-world architecture: dual-role workflows, status transitions, and resilient backend behavior
- Built with a modern TypeScript stack and production-minded patterns


### 1) AI Customer Ordering Assistant

Customers can type requests like:
- "Find sushi near me"
- "Add 2 burgers from The Vortex Tucker"
- "Place my order to 120 Main St"

The assistant:
1. Reads live restaurant menus and current cart context
2. Understands user intent from natural language
3. Returns structured actions when needed:
   - `add_to_cart`
   - `place_order`
4. Falls back to conversational guidance when clarification is needed

### 2) AI Location-Aware Food Fallbacks

If an item is not available in nearby QuickBite menus, the assistant can re-check nearby food options via Google Places and suggest closest matches with distance in miles.

### 3) AI Driver Copilot

Drivers choose an intent and get ready-to-send customer messages:
- ETA update
- Arrival message
- Delay notice
- Cannot reach customer
- Custom prompt

This reduces friction and keeps communication concise and professional.

## How It Works (End-to-End Flow)

### Customer Flow

1. Customer logs in
2. App detects location (with fallback + cache)
3. Nearby restaurants are fetched and sorted by distance (miles)
4. Customer orders using AI chat
5. AI emits structured cart/order actions
6. Order is placed and tracked live
7. Customer can message driver in real time

### Driver Flow

1. Driver logs in and goes online
2. Driver views and accepts pending deliveries
3. Driver updates order status through delivery lifecycle
4. Driver uses AI copilot for customer messages
5. Completed orders are tracked in history and stats

## Architecture Overview

### Frontend
- Next.js App Router + React 19 + TypeScript
- Role-based UI for customers and drivers
- Context-based state management for auth and cart

### Backend
- Next.js route handlers for auth, chat, orders, carts, restaurants, and driver operations
- API-driven business logic and validation

### Database
- Supabase (PostgreSQL)
- Tables for users, customers, drivers, restaurants, menus, carts, orders, and order messages
- Order status lifecycle and relational links between actors and orders

### AI Layer
- OpenAI chat completions for:
  - customer ordering assistant
  - driver message copilot
- Prompted for structured, operational outputs where appropriate

### Geolocation and Discovery
- Browser geolocation with timeout and cache
- Multi-source restaurant pipeline:
  - Supabase
  - Google Places
  - Overpass fallback
- Distances computed in miles via Haversine

## Tech Stack

- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4
- Supabase
- OpenAI API
- Google Maps Places API

## Local Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment

```bash
cp .env.example .env.local
```

Add required values to `.env.local`:

```env
OPENAI_API_KEY=sk-proj-...

GOOGLE_MAPS_API_KEY=...

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

> **Optional:** `OPENAI_MODEL` defaults to `gpt-4.1` when unset. Override it if you want to use a different model (e.g. `OPENAI_MODEL=gpt-4o`).

### 3) Initialize database

Run the SQL in `supabase.sql` using your Supabase SQL Editor.

### 4) Seed demo data

```bash
npm run seed
```

Optional: seed sample pending orders and test accounts for full delivery demos:

```bash
npm run seed:orders
```

Test accounts created by `seed:orders`:
- Driver: `dummy.driver@quickbite.test` / `password123`
- Customer: `dummy.customer@quickbite.test` / `password123`

### 5) Start app

```bash
npm run dev
```

Open http://localhost:3000

## Docker (Optional)

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=your_supabase_url \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key \
  -t quickbite .

docker run -p 3000:3000 \
  -e OPENAI_API_KEY=your_key \
  -e GOOGLE_MAPS_API_KEY=your_key \
  -e SUPABASE_SERVICE_ROLE_KEY=your_key \
  quickbite
```

## Key Engineering Highlights

- LLM-integrated product actions, not just chat responses
- Fallback-aware architecture for location and restaurant discovery
- Dual-role domain modeling and delivery lifecycle states
- Type-safe full-stack implementation with modern React and Next.js

## Project Docs

- `AI_IMAGE_SEARCH_SETUP.md`
- `GEOLOCATION_FEATURE.md`
- `DISTANCE_AND_IMAGES_UPDATE.md`
- `PRODUCTION_DEMO_SETUP.md`
- `TEAM_SETUP.md`

## Status

Actively evolving and demo-ready, with AI-first product functionality already implemented across customer and driver workflows.
