# 🥊 Gym Battle — Driss vs Younes

A 1v1 gym competition web app. Log workouts, bodyweight, and calories; get
Liftoff-style strength ranks, CS2-style session ratings, weekly ELO battles,
PR celebrations, and session MVP crowns. Mobile-first, dark gym aesthetic.

## How it works

- **Strength rating** (per lift): Epley est. 1RM ÷ bodyweight × 100.
  9-tier ladder: Wood → Bronze → Silver → Gold → Platinum → Diamond → Champion → Titan → Olympian.
  Your overall rank = average of your 3 best lifts.
- **Session rating**: sum of set ratings ÷ 100, shown like `1.24`. When both
  log a session the same day, the higher score gets the 👑 SESSION MVP crown.
- **Weekly battle** (Mon–Sun): 100/session + 1 per 100kg volume + 50 per PR +
  25 per day calories ≥ target + 100 if bodyweight moved toward your goal.
  Winner takes ELO (standard formula, K=32). Tie = no change.
- **Streaks**: consecutive weeks with ≥ 1 session.

## Project layout

```
gym-battle/
├── README.md                  ← you are here
├── supabase-schema.sql        ← run once in Supabase SQL editor
└── source/                    ← the Vite app (publish dist/ to GitHub Pages)
    ├── index.html
    ├── vite.config.js         ← React code, aliased to Preact for a tiny bundle
    ├── package.json
    └── src/
        ├── main.jsx, App.jsx, index.css
        ├── preact-root.js
        ├── config.js          ← ★ paste your Supabase URL + anon key here
        ├── lib/
        │   ├── ratings.js     ← Epley, tiers, ELO, week points, streaks
        │   ├── stats.js       ← derived stats (bests, MVP, PRs, head-to-head)
        │   ├── store.js       ← Supabase data layer + demo fallback
        │   └── demo.js        ← preview data (used until Supabase is connected)
        └── components/
            ├── Onboarding.jsx ← first-visit setup (names, goals, starting stats)
            ├── Battle.jsx     ← home: ELO duel, weekly battle bar, PRs, sessions
            ├── Logger.jsx     ← workout logger
            ├── BodyTab.jsx    ← bodyweight chart + calorie log
            ├── Ranks.jsx      ← ladder, ELO history, head-to-head
            └── ui.jsx         ← badges, SVG charts
```

## Setup (Driss, do this once)

1. **Create the database** — free at https://supabase.com → New project →
   open the SQL editor → paste the entire `supabase-schema.sql` → Run.
2. **Get your keys** — Supabase dashboard → Project Settings → API:
   copy the `Project URL` and the `anon` `public` key.
3. **Paste them** into `source/src/config.js`:
   ```js
   export const SUPABASE_URL = 'https://xyzcompany.supabase.co'
   export const SUPABASE_ANON_KEY = 'eyJhbGciOi...'
   ```
4. **Build**: `cd source && npm install && npm run build` → outputs `dist/`.
5. **Publish to GitHub Pages** (same pattern as the portfolio / editing ledger):
   create a repo (e.g. `gym-battle`), push the contents of `dist/` to the
   repo root (or a `gh-pages` branch), enable Pages. Share the link with Younes.

Until step 3 is done, the app runs on built-in **demo data** with a banner
saying so — everything renders and is clickable, nothing is saved anywhere.

## Preview locally

```
cd source
npm install
npm run dev      # → http://localhost:5173
```

## Notes / simplifications

- **Realtime**: the app subscribes to Supabase changes, so a session Younes
  logs appears on Driss's phone within seconds; it also refetches after every
  own action and on tab switch back.
- **Onboarding** only shows when Supabase is connected and no profiles exist
  yet. In demo mode the two demo fighters are pre-seeded.
- **Settling a week**: on the Battle tab, a "Settle week" button appears for
  the last completed week once both have sessions. One tap computes points,
  updates ELO, and writes history. Settle each Monday for the week just ended.
- **Bodyweight for ratings** uses each lifter's most recent weigh-in on or
  before the session date (falls back to their starting weight).
- **Pull-ups/dips**: log `weight_kg` as bodyweight + added weight (e.g. 61kg
  bodyweight, no belt = 61) so the 1RM estimate stays meaningful.
- **RLS** is permissive `anon` full-access — fine for a 2-person fun app,
  do not put anything sensitive in it.
- Bundle is ~283KB (~78KB gzipped), mostly the Supabase client.
