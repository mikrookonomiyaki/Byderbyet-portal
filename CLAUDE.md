# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (Vite HMR)
npm run build      # Production build
npm run lint       # ESLint
npm run preview    # Preview production build locally
```

No test suite exists. Linting is the only automated check before building.

## Environment

Copy `.env.example` (or create `.env.local`) with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Both values come from the Supabase project dashboard under Project Settings > API.

## Architecture

Single-page React app (Vite + React Router v7) backed by Supabase (PostgreSQL + Auth + Realtime).

**Routes** (`src/App.jsx`):
- `/` — public tournament view and leaderboard (`PublicView`)
- `/events` — all historical events as clickable cards (`EventsOverview`)
- `/event/:name` — per-event history across years (`EventHistory`)
- `/participant/:name` — player profile with yearly breakdown (`ParticipantProfile`)
- `/admin` — login (`AdminLogin`)
- `/admin/dashboard` — result entry grid (`AdminDashboard`)

**Core data hook** — `src/hooks/useTournamentData.js`
The central hook used by both public and admin views. Fetches tournaments, events, participants, doeng_scale, and results, then computes standings. Pass `{ publishedOnly: false }` for admin to see draft events. It also subscribes to Supabase Realtime for live score updates during active tournaments.

**Hall of Fame** — `src/hooks/useHallOfFame.js`
Calls the `hall_of_fame()` Supabase RPC (a `SECURITY DEFINER` PostgreSQL function). Never replace with client-side computation.

**Event name normalization** — `src/eventNames.js`
`canonicalize(name)` maps variant spellings to canonical names (e.g. "dart" → "Darts"). Always apply this when displaying or grouping event names. The `EventsOverview` page also lowercases keys before grouping to handle case mismatches in the database.

**Event icons** — `src/utils/eventIcons.js`
`getEventIcon(name)` maps canonical event names to emoji. **Do not modify this file.**

## Scoring logic

Two modes, determined by `tournaments.scoring_direction`:
- `'asc'` (2022+, "Doeng"): **lowest** total wins. Points come from `doeng_scale` table (position → points lookup).
- `'desc'` (2019–2021, "Poeng"): **highest** total wins. Same scale lookup applies.
- If `scoring_direction` is NULL, falls back to `'asc'`.

**Hansa events** (`is_hansa = true`): the `placement` column stores points directly, not a placement rank. No scale lookup.

**Point scale for desc-mode** (stored in `doeng_scale`): 1→17, 2→15, 3→13, 4→11, 5→10, 6→9, 7→8, 8→7, 9→6, 10→5, 11→4, 12→3, 13→2, 14→1, 15+→0.

## Database

Schema is in `supabase/schema.sql`. Migration scripts are in `supabase/` — run them manually in Supabase SQL Editor.

**Key schema facts:**
- `tournaments.id` is a plain TEXT primary key: `'2023'`, `'2024'`, `'2025'` for recent years; 2019–2021 use UUIDs.
- `events.is_published` (BOOLEAN, default TRUE): controls visibility in public view. New events created via admin default to `false` (draft).
- `participants` and `events` are scoped per tournament — the same player name exists as separate rows each year.
- Always use `.limit(10000)` on `participants`, `events`, `results`, and `doeng_scale` queries that span multiple tournaments. Supabase's default SELECT limit is 1000 rows and cross-year queries will silently truncate without it.

**Day ordering** for display: Fredag (0) → Lørdag (1) → Søndag (2). Implemented in `useTournamentData.js` as `DAY_ORDER`.

**Supabase RPC:** `hall_of_fame()` — computes yearly tournament winners entirely in PostgreSQL. Already deployed. Call via `supabase.rpc('hall_of_fame')`.

## Admin

`/admin/dashboard` requires Supabase Auth (email/password). The `TournamentEditor` component renders a spreadsheet-style grid where admins enter per-participant placements. Changes are batched and saved via a single `results.upsert()` call. Forms for adding participants and events live in `src/components/AdminForms.jsx`.

## Persistent rules

- **Never modify `src/utils/eventIcons.js`** — the icon mapping is finalized.
- **Batch changes before deploying** — confirm all intended changes with the user before pushing and creating a PR. Minimize round-trips.
- **Working branch**: `claude/ecstatic-faraday-sbcezn` — all development goes here; push with `git push -u origin claude/ecstatic-faraday-sbcezn`.
