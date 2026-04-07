# QuickBite — Food Delivery App

![GitHub stars](https://img.shields.io/github/stars/bobbleteeb/Team-Sleep?style=social)
![GitHub forks](https://img.shields.io/github/forks/bobbleteeb/Team-Sleep?style=social)
![GitHub issues](https://img.shields.io/github/issues/bobbleteeb/Team-Sleep)
![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwind-css)

A full-stack food delivery app built with Next.js, Supabase, and OpenAI. Supports two roles — **customers** can browse nearby restaurants, place orders, and chat with drivers; **drivers** can accept deliveries, track earnings, and use an AI copilot to message customers.

> **Status:** Work in progress

---

## Running with Docker

### 1. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` with your keys:

```env
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4

GOOGLE_MAPS_API_KEY=...

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 2. Build the image

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=your_supabase_url \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key \
  -t quickbite .
```

### 3. Run the container

```bash
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=your_key \
  -e GOOGLE_MAPS_API_KEY=your_key \
  -e SUPABASE_SERVICE_ROLE_KEY=your_key \
  quickbite
```

Open [http://localhost:3000](http://localhost:3000).

---

## Running locally (without Docker)

```bash
npm install
npm run dev
```
