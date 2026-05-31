# Fantasy Ekadashi

A fantasy bracket for the world's most peaceful sport: spending the least time on your phone.

On every Ekadashi (twice a month, per the Hindu lunar calendar), registered players are paired up. Each player submits their daily phone screen time. **Lowest screen time wins** and advances in the bracket. Last one standing takes the league.

Built with Next.js 16, Supabase, Tailwind v4, and Tesseract.js. Designed to run entirely on **free tiers** (Vercel + Supabase Spark) and to work as a PWA on iPhone and Android.

---

## Why this exists

Ekadashi is traditionally a day of restraint and reflection. Fantasy Ekadashi turns that intention into a friendly social game with a real consequence (your bracket position) and zero infrastructure cost.

## Important: how screen time is "read"

Web apps **cannot** read OS-level Screen Time on iOS or Android — Apple and Google reserve that for native apps. So Fantasy Ekadashi uses a screenshot + OCR + honor system flow:

1. On Ekadashi night, you upload a screenshot of your iOS **Screen Time** or Android **Digital Wellbeing** summary.
2. [Tesseract.js](https://tesseract.projectnaptha.com/) runs **in your browser** and extracts the daily total.
3. You can edit the number if the OCR misreads.
4. The screenshot becomes visible to your opponent. They can **dispute** if it looks fake or cropped, and the league creator settles disputes.

If you'd prefer not to upload a screenshot, you can just type the number — but your opponent can dispute that too.

## Tech stack

| Concern         | Choice                                                     | Free tier?  |
| --------------- | ---------------------------------------------------------- | ----------- |
| Framework       | Next.js 16 (App Router, React 19, React Compiler)          | yes         |
| Styling         | Tailwind CSS v4                                            | yes         |
| Hosting         | Vercel (Hobby plan)                                        | yes         |
| Auth + DB + Storage | Supabase (Free plan: 500 MB DB, 1 GB storage, 50k MAU) | yes         |
| OCR             | Tesseract.js (runs in-browser, no API key)                 | yes         |
| Ekadashi dates  | SunCalc + custom tithi calc (no external API)              | yes         |
| Icons           | lucide-react                                               | yes         |

Total recurring cost at small scale: **$0**.

---

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Sign up at [supabase.com](https://supabase.com) (free).
2. New project → pick any region and password.
3. Wait ~1 minute for provisioning.

### 3. Apply the database schema

1. In the Supabase dashboard, open **SQL Editor → New query**.
2. Paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and run it.

This creates all tables, RLS policies, the `screenshots` storage bucket, and the trigger that auto-creates a profile row on signup.

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in three values from **Supabase dashboard → Project Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL` — your project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the `anon` `public` key
- `SUPABASE_SERVICE_ROLE_KEY` — the `service_role` `secret` key (server-only)

### 5. Configure auth redirect URL

In Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: add `http://localhost:3000/auth/callback` (and your eventual production URL + `/auth/callback`)

### 6. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploying to Vercel (free)

1. Push this repo to GitHub.
2. [Import the project on Vercel](https://vercel.com/new) — it auto-detects Next.js.
3. In **Project Settings → Environment Variables**, paste the three Supabase vars from your `.env.local`.
4. Deploy.
5. In your Supabase project, add your production URL to **Authentication → URL Configuration → Redirect URLs**: `https://your-app.vercel.app/auth/callback`.

---

## How it all fits together

### Ekadashi date calculation — `src/lib/ekadashi.ts`

We compute the moon's illumination phase at hourly intervals via SunCalc, identify every window where the tithi index equals 10 (Shukla Paksha Ekadashi) or 25 (Krishna Paksha Ekadashi), and assign each window to the calendar date in the league's timezone that contains its midpoint. This gives exactly one Ekadashi per half-month — no "skipped" (*kshaya*) or "doubled" (*vriddhi*) edge cases.

Verify against a calendar:

```bash
node scripts/check-ekadashi.mjs
```

### Bracket logic — `src/server/lib/bracket.ts`

Single-elimination, random pairings, byes assigned randomly when the player count isn't a power of two. The next round is generated automatically once every match in the current round resolves.

### Match resolution — `src/server/actions/matches.ts`

When a player submits, we upsert their submission and check if the match can be resolved. If both players submitted and neither disputed, the lower screen time wins. If disputed (or tied), the match transitions to `pending_review` and the league creator picks the winner.

### Auth — `@supabase/ssr` magic-link

`src/app/sign-in` issues an OTP, `src/app/auth/callback` exchanges the code for a session cookie. `src/proxy.ts` (Next 16's renamed middleware) refreshes that cookie on every request.

### Schema — `supabase/schema.sql`

Five tables: `profiles`, `leagues`, `league_members`, `matches`, `submissions`. RLS is enabled on all of them. Helpers like `is_league_member(uuid)` are `security definer` to dodge the recursive-RLS trap.

---

## Project layout

```
src/
  app/
    page.tsx               landing
    about/page.tsx         about
    sign-in/               magic-link form
    auth/callback/         OAuth code exchange
    dashboard/             logged-in home
    leagues/new            create a league
    leagues/join           join with invite code
    leagues/[id]           league detail + bracket
    matches/[id]           match detail + submission form
    layout.tsx             root layout (nav, footer, PWA meta)
    globals.css            Tailwind v4 + theme tokens
  components/
    Nav.tsx                top nav
    Bracket.tsx            tournament bracket renderer
    ScreenTimeSubmit.tsx   OCR upload + manual override (client)
    CountdownToEkadashi.tsx
    CopyButton.tsx
    DisputeForm.tsx
    CreatorResolveForm.tsx
    SignOutButton.tsx
    ui.tsx                 Button, Card, Input, Badge primitives
  lib/
    ekadashi.ts            tithi-based date library
    utils.ts               cn, time parsing/formatting, invite codes
    supabase/
      client.ts            browser client
      server.ts            server-component / route-handler client
      admin.ts             service-role client (bypasses RLS)
      types.ts             TypeScript mirror of the SQL schema
  server/
    actions/leagues.ts     create, join, leave, start
    actions/matches.ts     submit, dispute, creator-resolve, advance round
    lib/bracket.ts         pure pairing helpers
  proxy.ts                 session-refresh "middleware" (Next 16 convention)
supabase/
  schema.sql               run this once in Supabase SQL editor
scripts/
  check-ekadashi.mjs       sanity-check the date calc
public/
  manifest.webmanifest     PWA manifest
  icons/                   crescent-moon SVG icons
```

---

## Roadmap / ideas

- **Daily/round notifications** via a free SMTP relay or web push
- **Match chat** (Supabase Realtime, free tier)
- **Multiple leagues per Ekadashi** (already supported in the data model)
- **Multi-region timezones** per player (today the whole league uses one tz)
- **iPhone Shortcut integration** that auto-submits Screen Time without a screenshot
- **Repechage** — a "loser's bracket" so eliminations sting less
- **Personal stats** — average screen time, longest streak under N hours, etc.

PRs welcome.

---

## License

MIT.
