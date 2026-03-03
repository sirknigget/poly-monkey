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
yarn test:e2e           # E2E/integration tests (test/*.e2e-spec.ts) — runs serially

# Quality
yarn lint               # ESLint with auto-fix
yarn format             # Prettier --write

# Database migrations
yarn migration:generate MigrationName  # Pass only the name — path prefix is baked into package.json
yarn migration:run      # Run pending migrations
yarn migration:revert   # Revert last migration
yarn schema:drop        # Drop entire schema

# Local infrastructure
docker-compose up -d    # Start PostgreSQL 16 + Redis containers
```

To run a single unit test file:
```bash
yarn test -- activity.service.spec.ts
```

## Environment Setup

`.env` already exists and is configured, but is not readable by Claude. Reference `.env.template` for the required variable names:
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_IDS` — required for notification delivery; comma-separated IDs
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`, `DB_USE_SSL` — required at startup (`getOrThrow` enforces this)
- `ADMIN_KEY_HASH` — bcrypt hash used by `AdminAuthGuard`; all endpoints require `x-admin-key` header
- `REDIS_HOST`, `REDIS_PORT` — BullMQ queue connection
- `ACTIVITY_FETCH_LIMIT` — optional, defaults to 100; max raw activities fetched per address
- `ACTIVITY_LOOKBACK_MS` — lookback window in milliseconds for fetching activities

The E2E notification test reads `.env` directly if env vars aren't already set.

## Architecture

**Pipeline triggered by `POST /activity/notify`:**

```
ActivityNotifierController
        ↓
ActivityNotifierQueueService (enqueue to BullMQ)
        ↓ (BullMQ job)
ActivityNotifierProcessor (consume)
        ↓
ActivityNotifierService
        ↓               ↓              ↓
ActivityService    ActivityDao    TelegramService
        ↓
PolymarketApiModule
(HTTP transport)
```

1. **`polymarket-api/`** — thin HTTP wrapper around `data-api.polymarket.com/activity`. Public methods: `getActivities(userAddress, limit)` returning `RawActivity[]`, and `getProfile(userAddress)` returning `PolymarketProfile | null`.

2. **`activity/`** — business logic across four components:
   - `ActivityNotifierQueueService`: enqueues a job; reads `ACTIVITY_FETCH_LIMIT` from env.
   - `ActivityNotifierProcessor` (`@Processor`): consumes jobs and delegates to `ActivityNotifierService`.
   - `ActivityService.fetchActivities(userAddress, limit, fromTime)`: groups `RawActivity` records by composite key `[timestamp, slug, outcome, side]`, aggregates each group (sum `usdcSize` → `totalPriceUsd`, sum `size` → `numTokens`), sorts descending by timestamp.
   - `ActivityDao`: TypeORM repository wrapper. Checks deduplication by aggregation key `[timestamp, marketSlug, outcomePurchased, side, userAddress]`, persists seen activities, prunes records older than 60 days.
   - `ActivityNotifierService`: orchestrator. Reads addresses from `UserAddressDao`, fetches activities within the `ACTIVITY_LOOKBACK_MS` window, filters already-seen via `ActivityDao`, sends Telegram messages for new ones, then persists them.

3. **`notification/`** — `NotificationFormattingService` renders HTML for Telegram (includes user profile name if available); `TelegramService` broadcasts to all configured chat IDs in parallel.

4. **`user-address/`** — manages which Polymarket wallet addresses to monitor, stored in DB (not env). `UserAddressController` exposes CRUD at `POST /user-addresses`, `DELETE /user-addresses/:address`, `GET /user-addresses`, and `PUT /user-addresses/profiles/refresh`. `UserManagerService.add()` fetches the Polymarket profile and stores it alongside the address.

**Root module** (`app.module.ts`) wires: `ConfigModule` (global), `TypeOrmModule` (async), `BullModule` (async), `ActivityModule`, `NotificationModule`, `LoggingModule`, `UserAddressModule`.

**Database** (`src/config/database.config.ts`): TypeORM async config; `synchronize: false` always — schema managed via migrations. `migrationsRun: true` means migrations run automatically at startup. Data source for CLI is `src/database/data-source.ts`.

## Testing Patterns

Unit tests live alongside source files (`*.spec.ts`). E2E tests are in `test/`.

- Uses `@suites/unit` (`@suites/di.nestjs`, `@suites/doubles.jest`) for auto-mocking in unit tests — creates isolated units with all dependencies mocked.
- For integration-style unit tests: use `overrideProvider(PolymarketApiService)` to inject a mock into a real NestJS test module.
- The `polymarket-activity.e2e-spec.ts` test hits the **live Polymarket API** — non-deterministic, requires network access.
- The `notification.e2e-spec.ts` test sends a **real Telegram message** — requires `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_IDS`.

## Key Types

`RawActivity` (`polymarket-api/polymarket-api.types.ts`) — raw API response shape with optional fields including `timestamp` (Unix seconds), `transactionHash`, `slug`, `outcome`, `side`, `usdcSize`, `size`, `price`.

`PolymarketActivity` (`activity/activity.entity.ts`) — TypeORM entity and normalized output. Key fields: `transactionHashes` (text array), `timestamp`, `eventTitle`, `eventLink`, `marketSlug`, `outcomePurchased`, `side`, `totalPriceUsd`, `numTokens`, `avgPricePerToken`, `activityCount`, `orders` (jsonb).

`Order` (`activity/activity.entity.ts`) — `{ tokenPrice, numTokens, priceUsdt }` — one entry per raw transaction in the aggregated activity.

## Docs

Architecture decisions and design documents are in `docs/` (ADRs, design docs, PRDs, task plans).
