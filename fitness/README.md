# Fitness & Nutrition Tracker

Personal-use, MyFitnessPal-style calorie and macro tracker. Lives in `fitness/`
**completely separate** from the World Cup app — its own Worker, own database,
own deploy. Nothing here touches the worldcup Worker or its R2 bucket.

Full design: [`../docs/fitness-nutrition-tracker-spec.md`](../docs/fitness-nutrition-tracker-spec.md)

## What's implemented (phase 1 — backend)

- **D1 schema** (`migrations/0001_init.sql`): foods (per-100g nutrients), named
  servings, diary entries with nutrition snapshots, exercise logs, weight logs,
  favorite meals.
- **Calorie engine** (`shared/engine.js`): Mifflin-St Jeor BMR, TDEE, goal
  budgets, 4/4/9 macro targets, MET exercise burn, net-calorie summaries.
  Pure functions, unit-tested.
- **Worker API** (`worker/index.js`): every endpoint from spec §5 — profile,
  weight, food search/barcode/import (Open Food Facts), diary CRUD,
  copy-from-yesterday, exercise logs, favorites, calorie/macro reports.
- **Seed data** (`seed/seed.sql`): 20 common foods with servings + 18 MET
  exercises.

Not yet built: the React dashboard UI (phase 2).

## Setup

```sh
cd fitness
npm install

# one-time: create the D1 database, then paste its id into wrangler.toml
npm run db:create

# local development (uses a local SQLite copy, no Cloudflare resources)
npm run db:migrate:local
npm run db:seed:local
npm run dev                      # API at http://localhost:8787

# production
npm run db:migrate
npm run db:seed
npm run deploy
```

## Quick tour (curl)

```sh
API=http://localhost:8787/api/v1

# 1. Set up your profile (also returns computed BMR/TDEE/budget/macros)
curl -X PUT $API/me -H 'Content-Type: application/json' -d '{
  "sex": "male", "birth_date": "1990-06-15",
  "height_cm": 180, "weight_kg": 84,
  "activity_level": "light",
  "goal_type": "lose", "goal_rate_kg_per_week": -0.5
}'

# 2. Find food and log half a cup of oats to breakfast
curl "$API/foods?q=oats"
curl -X POST $API/me/diary/2026-06-12/entries -H 'Content-Type: application/json' \
  -d '{"meal":"breakfast","food_id":"food_rolled_oats","serving_id":"srv_oats_halfcup","quantity":1}'

# 3. Log 30 min of running (kcal auto-computed from MET x your weight)
curl -X POST $API/me/exercise-logs -H 'Content-Type: application/json' \
  -d '{"date":"2026-06-12","exercise_id":"ex_run_8","duration_min":30}'

# 4. The daily log — remaining calories, macro totals, per-meal breakdown
curl $API/me/diary/2026-06-12

# 5. Save breakfast as a favorite, apply it tomorrow in one call
curl -X POST $API/me/favorites/from-diary -H 'Content-Type: application/json' \
  -d '{"date":"2026-06-12","meal":"breakfast","name":"Usual breakfast"}'
curl -X POST $API/me/favorites/<id>/apply -H 'Content-Type: application/json' \
  -d '{"date":"2026-06-13"}'

# 6. Barcode: look up, and import from Open Food Facts on a miss
curl $API/foods/barcode/5000159484695
curl -X POST $API/foods/barcode/5000159484695/import
```

## Tests

```sh
npm test    # node --test, no dependencies needed
```

## Securing it

The API is open by default (fine for local dev). Before deploying publicly:

```sh
wrangler secret put API_TOKEN
```

Every request then needs `Authorization: Bearer <token>`.
