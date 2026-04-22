# Data Seeding

## Competitions

`data/activeCompetitions.json` is the source of truth for all production competitions. There are no admin UI routes for creating or editing competitions — they are managed as code.

### Adding or updating a competition

1. Edit `data/activeCompetitions.json`
2. Deploy — `startup/competitions.js` will upsert all competitions automatically on startup

Upserts are keyed on `code` and are idempotent, so redeploying without changes is safe. Existing MongoDB `_id`s are preserved, meaning all linked predictions, matches, and results remain intact.

### Testing the seeding locally

By default, seeding is disabled in dev and test environments. To verify the seeding path locally:

1. Set `seedCompetitionsOnStartup` to `true` in `config/default.json`
2. Run `npm run dev`
3. Check the console for `Seeded 3 competition(s)...`
4. Revert `config/default.json` when done

---

## Dev / Test Data

Dev and test environments use separate fixture competitions (`devCupActive`, `devCupPast`, `devCupFuture`) defined in `scripts/devData/competitions.js`. These are seeded by running:

```bash
npm run dev-setup
```

This script also seeds users, matches, results, and calculates prediction scores. It connects to the local `dosshouse` database and is safe to re-run (upserts throughout).

The test suite (`npm test`) manages its own data against `mongodb://localhost/dosshouse_tests` and does not rely on `dev-setup`.
