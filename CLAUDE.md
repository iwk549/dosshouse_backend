# dosshouse_backend

Node.js/Express REST API backend for the Dosshouse sports prediction app (World Cup picks, etc.).

## Stack

- **Runtime**: Node.js 20.x
- **Framework**: Express 4 with `express-async-errors`
- **Database**: MongoDB via Mongoose 6
- **Auth**: JWT (`jsonwebtoken`) + Google OAuth (`google-auth-library`) + bcrypt passwords
- **Email**: AWS SES via `@aws-sdk/client-ses`
- **Validation**: Joi + `joi-password-complexity` + `joi-objectid`
- **Process manager**: `throng` (multi-worker)
- **Testing**: Jest + Supertest (runs with `--runInBand`)
- **Config**: `config` package — `config/default.json`, `config/test.json`, `config/production.json`, `config/custom-environment-variables.json`

## Project Structure

```
index.js              # Entry point — throng worker setup
startup/              # App initialization (routes, db, logging, prod, config, competitions)
routes/
  routers/            # Express routers (one per resource)
  controllers/        # Route handler logic (one per resource)
models/               # Mongoose models + Joi validation schemas
middleware/           # auth, admin, errors, rateLimiter, validateObjectID
utils/                # allowables, calculations, emailing, htmlTemplates, transactions, users
config/               # Environment config files
data/                 # Source-of-truth data files (activeCompetitions.json)
scripts/              # Dev setup and seeding utilities
__test__/             # Integration tests (Jest + Supertest)
```

## API Base Path

All routes are prefixed with `/api/v1/`. Resources: `competitions`, `matches`, `users`, `predictions`, `results`, `groups`, `admin`. Health check: `/api/v1/healthz`.

## Running

```bash
npm run dev          # nodemon dev server (port 3001)
npm test             # Jest watch mode
npm run test:pull_request  # CI: coverage + detectOpenHandles
npm run audit        # Security audit (moderate+ prod deps)
```

## Testing

- Tests require a local MongoDB instance at `mongodb://localhost/dosshouse_tests`
- Run tests with `--runInBand` (sequential) — required for shared DB state
- Coverage thresholds enforced: statements 90%, branches 80%, functions 85%, lines 90%
- Global teardown in `test-teardown-globals.js`

## Config / Secrets

- `config/default.json` has placeholder values; real secrets set via env vars mapped in `custom-environment-variables.json`
- Required: `jwtPrivateKey`, `db` connection string
- JWT tokens include `_id`, `name`, `email`, `role`

## Competition Data

Competitions are read-only for users and have no admin routes. `data/activeCompetitions.json` is the source of truth.

- **Production**: `startup/competitions.js` upserts competitions on every startup (`seedCompetitionsOnStartup: true` in `config/production.json`). To add or update a competition, edit the JSON and deploy.
- **Dev/Test**: seeding is off by default (`seedCompetitionsOnStartup: false`). To test the seeding path locally, temporarily flip the flag in `config/default.json`.
- **Dev data**: `scripts/devSetup.js` seeds separate `devCup*` competitions from `scripts/devData/competitions.js` — unrelated to the production data file.
- Upserts are idempotent (keyed on `code`) and preserve existing MongoDB `_id`s, so predictions and other references are unaffected.
- `throng` runs multiple workers in production — each will upsert on startup. This is safe but produces duplicate log lines.

## Key Conventions

- Controllers in `routes/controllers/`, routers in `routes/routers/` — keep them separate
- Validation functions live in the model file alongside the Mongoose schema
- Rate limiting applied at `/api/` level via `middleware/rateLimiter.js`
- `express-async-errors` is used — no need to wrap async handlers with try/catch
