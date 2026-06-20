# Fantasy Ekadashi

A free, mobile-and-desktop fantasy bracket where the player with the **least
screen time** on each Ekadashi advances. Built to cost **$0** to run.

> **Ekadashi** is the 11th day of each lunar fortnight (twice a month) — a
> traditional day of restraint. Here it becomes a friendly competition.

## How it works

- An **admin** creates a **league** and shares a 6-character join code.
- Players join with their **name + phone number** and set a password.
  (Name is public; phone is private and used only to log in — **no SMS is sent**.)
- The admin **starts the league**. It then runs as an **ongoing league**: on
  every Ekadashi, eligible players are randomly paired (odd player gets a bye).
- **Matchups are generated ~1 day before each Ekadashi** (00:00 the day before).
  Players who joined on/before the **cutoff** (23:00 two days before) are paired
  for that Ekadashi; anyone who joins later gets a bye and competes next time.
  This runs on a schedule (cron + lazy generation on page load).
- On each **Ekadashi**, paired players submit their screen time across four
  categories: **Social, Games, Entertainment, Creativity**. WhatsApp (which iOS
  files under Social) can be entered separately and is **subtracted**. Messages
  and FaceTime aren't in any competed category, so they never count.
- **Lowest total wins** the head-to-head. Nobody is eliminated — losers are just
  marked on that Ekadashi's leaderboard, and everyone keeps playing.
- Each Ekadashi has a **leaderboard** (lowest time on top, losers marked), plus
  **all-time standings** (W–L record, byes, average time).
- The admin can **delete** a league at any time.

### Screen time verification

Web apps can't read OS screen time, so each player **uploads a screenshot** of
their iOS Screen Time **"Show Categories"** view. [Tesseract.js](https://tesseract.projectnaptha.com/)
reads it **in the browser** and pre-fills the four category fields (always
editable). The screenshot is shared with the opponent for transparency, and
they can **dispute** — the group admin then settles it. It's an honor system,
fitting for a fasting day.

## Tech stack (all free tiers)

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, TypeScript) |
| UI | React 19 + Tailwind CSS v4 |
| Auth / DB / Storage | Supabase (Postgres, Auth, Storage) |
| OCR | Tesseract.js (client-side) |
| Lunar math | suncalc + date-fns-tz |
| Hosting | Vercel (Hobby) |
| Keep-alive | GitHub Actions cron |

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com/dashboard).
2. In the **SQL editor**, paste and run [`supabase/schema.sql`](supabase/schema.sql).
   This creates all tables, RLS policies, the `screenshots` storage bucket, and
   the signup trigger.
3. In **Authentication → Sign In / Providers → Email**: make sure the **Email
   provider is ON**, and turn **"Confirm email" OFF**. We use phone + password
   mapped to synthetic emails (`<digits>@fe.local`), so the email provider must
   be enabled and there's no inbox to confirm. (If the Email provider is off,
   account creation works but sign-in fails with "Email logins are disabled".)

### 2. Environment

Copy `.env.example` to `.env.local` and fill in (from **Settings → API**):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # server-only; never exposed to the client
ADMIN_PHONES=15551234567             # digits-only phone(s) allowed to create groups
```

> Put **your** phone number (digits only, no `+`/spaces) in `ADMIN_PHONES`
> **before** you sign up — that's what makes you an admin who can create groups.

### 3. Run

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Visit `/api/health` to confirm the DB is reachable.

## Deploy (free)

1. Push to GitHub and import the repo in [Vercel](https://vercel.com).
2. Add the same env vars in Vercel project settings.
3. Deploy.

### Keep-alive + scheduled matchmaking

The included GitHub Action
([`.github/workflows/keepalive.yml`](.github/workflows/keepalive.yml)) runs
daily and does two things:

1. Pings `/api/health` so Supabase's free tier doesn't pause the project
   (it sleeps after ~7 days idle; Ekadashi is only ~twice a month).
2. Pings `/api/cron/matchmaking` so each Ekadashi's pairings are generated
   ~1 day before, even if nobody opens the site.

Set a repository **variable** `APP_URL` to your deployed URL (e.g.
`https://your-app.vercel.app`). Optionally set a `CRON_SECRET` env var on the
host **and** a matching `CRON_SECRET` repository **secret** to lock down the
matchmaking endpoint.

## Project structure

```
src/
  app/                     # routes (landing, auth, dashboard, groups, matches, api/health)
  components/              # UI primitives + feature components (Bracket, Leaderboard, ScreenTimeSubmit…)
  lib/
    ekadashi.ts            # lunar tithi → Ekadashi dates (+ submission window)
    categories.ts          # the four competed categories + scoring
    utils.ts               # phone normalization, time parsing, join codes
    supabase/              # browser / server / admin clients + types
  server/
    actions/               # auth, groups, matches (server actions)
    lib/bracket.ts         # random pairing + byes
  proxy.ts                 # session-refresh middleware
supabase/schema.sql        # full database schema + RLS
```

## Notes & limits

- **No SMS:** phone is a login identifier, not SMS-verified (SMS isn't free
  anywhere). Fine for friend groups.
- **iOS-first:** category names match iOS Screen Time exactly. Android's Digital
  Wellbeing is more per-app, so OCR may need manual edits there.
- **Scoring ties** and **disputes** are resolved by the group admin.
