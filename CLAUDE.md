# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
yarn start:dev          # Hot-reload dev server (port 3000, or PORT env var)
yarn build              # Compile to dist/
yarn start:prod         # Run compiled output

# Testing
yarn test               # Unit tests (src/**/*.spec.ts)
yarn test:watch         # Unit tests in watch mode
yarn test:cov           # Unit tests with coverage report
yarn test:e2e           # E2E/integration tests (test/*.e2e-spec.ts)

# Quality
yarn lint               # ESLint with auto-fix
yarn format             # Prettier --write

# Local infrastructure
docker-compose up -d    # Start PostgreSQL 16 container
```

To run a single unit test file:
```bash
yarn test -- activity.service.spec.ts
```

## Environment Setup

`.env` already exists and is configured, but is not readable by Claude. Reference `.env.template` for the required variable names:
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_IDS` — required for notification delivery; comma-separated IDs
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` — required at startup (`getOrThrow` enforces this)

The E2E notification test reads `.env` directly if env vars aren't already set.

## Architecture

**Three-layer feature module pipeline:**

```
PolymarketApiModule  →  ActivityModule  →  NotificationModule
(HTTP transport)        (aggregation)       (Telegram delivery)
```

1. **`polymarket-api/`** — thin HTTP wrapper around `data-api.polymarket.com/activity`. One public method: `getActivities(userAddress, limit)` returning raw `RawActivity[]`.

2. **`activity/`** — business logic. `fetchActivities(userAddress, limit)` does:
   - Group raw records by `transactionHash`
   - Aggregate each group (sum `usdcSize` → `totalPriceUsd`, sum `size` → `numTokens`)
   - Cross-transaction merge: records sharing `[timestamp, marketSlug, outcomePurchased, side]` are deduplicated into one `PolymarketActivity`
   - Sort descending by timestamp

3. **`notification/`** — `NotificationFormattingService` renders HTML for Telegram; `TelegramService` broadcasts to all configured chat IDs in parallel.

**Root module** (`app.module.ts`) wires: `ConfigModule` (global), `TypeOrmModule` (async), `ActivityModule`, `NotificationModule`.

**Database** (`src/config/database.config.ts`): TypeORM async config; `synchronize: true` in dev/test, `false` in production. Entities auto-discovered via `autoLoadEntities`.

## Testing Patterns

Unit tests live alongside source files (`*.spec.ts`). E2E tests are in `test/`.

- Mock at the boundary: use `overrideProvider(PolymarketApiService)` to inject a mock, then test real `ActivityService` logic.
- The `polymarket-activity.e2e-spec.ts` test hits the **live Polymarket API** — it is non-deterministic and requires network access.
- The `notification.e2e-spec.ts` test sends a **real Telegram message** — requires `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_IDS`.

## Key Types

`RawActivity` (polymarket-api.types.ts) — raw API response shape with optional fields.

`PolymarketActivity` (activity.types.ts) — normalized output with 11 required fields including `transactionHash`, `date`, `eventLink`, `totalPriceUsd`, `numTokens`, `avgPricePerToken`, `activityCount`.

## Docs

Architecture decisions and design documents are in `docs/` (ADRs, design docs, PRDs, task plans).
