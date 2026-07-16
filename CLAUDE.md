# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
yarn install            # Install dependencies (Yarn 4)
yarn start:dev          # Hot-reload NestJS dev server (port 3000, or PORT env var)
yarn build              # Compile TypeScript to dist/
yarn start:prod         # Run compiled output from dist/main

# Testing
yarn test               # Unit tests (src/**/*.spec.ts)
yarn test:watch         # Unit tests in watch mode
yarn test:cov           # Unit tests with coverage report
yarn test:e2e           # E2E/integration tests (test/*.e2e-spec.ts) — runs serially

# Quality
yarn lint               # ESLint with auto-fix over src/ and test/
yarn format             # Prettier --write over src/ and test/

# Database migrations
yarn migration:generate MigrationName  # Pass only the name — package.json writes to src/database/migrations/$0
yarn migration:run      # Run pending migrations using src/database/data-source.ts
yarn migration:revert   # Revert last migration
yarn schema:drop        # Drop entire schema

# Local infrastructure
docker-compose up -d    # Start PostgreSQL 16 + Redis containers
```

To run a single unit test file:

```bash
yarn test -- activity.service.spec.ts
```

To run one E2E test file:

```bash
yarn test:e2e -- activity-notifier.e2e-spec.ts
```

## Environment Setup

`.env` exists locally but should not be read directly. Reference `.env.template` for variable names:

- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_IDS` — used by `TelegramService`; chat IDs are comma-separated.
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`, `DB_USE_SSL` — required by TypeORM startup and migration CLI config.
- `ADMIN_KEY_HASH` — bcrypt hash checked by `AdminAuthGuard`; protected endpoints require the `x-admin-key` header.
- `REDIS_HOST`, `REDIS_PORT` — BullMQ/Redis connection.
- `ACTIVITY_FETCH_LIMIT` — max raw activities fetched per monitored address.
- `ACTIVITY_LOOKBACK_MS` — lookback window in milliseconds for activity filtering.

`docker-compose.yml` starts Redis and PostgreSQL using the configured Redis/DB ports and database credentials. E2E tests use `jest.e2e.setup.js` for a 60s timeout and may hit real local infrastructure or external APIs depending on the spec.

## Architecture

This is a NestJS service that monitors stored Polymarket wallet addresses, aggregates recent trade activity, sends Telegram notifications, and persists notified activity for deduplication.

**Notification pipeline triggered by `POST /activity/notify`:**

```text
ActivityNotifierController
        ↓
ActivityNotifierQueueService (enqueue BullMQ job)
        ↓
ActivityNotifierProcessor (consume job)
        ↓
ActivityNotifierService
        ↓               ↓              ↓
ActivityService    ActivityDao    TelegramService
        ↓
PolymarketApiService
```

`AppModule` wires global `ConfigModule`, TypeORM via `src/database/database.config.ts`, BullMQ via `src/queue/queue.config.ts`, plus the activity, notification, logging, and user-address modules. TypeORM runs with `synchronize: false`; migrations are the schema mechanism, and `migrationsRun: true` runs compiled migrations automatically at app startup.

### Core modules

- `src/polymarket-api/` — HTTP wrapper around Polymarket APIs. `getActivities(userAddress, limit)` calls `https://data-api.polymarket.com/activity` for trade activity; `getProfile(userAddress)` calls the public profile API and returns `null` on 404.
- `src/activity/` — queue entrypoint and notification orchestration.
  - `ActivityNotifierController` exposes `POST /activity/notify`, protected by `AdminAuthGuard`.
  - `ActivityNotifierQueueService` enqueues the BullMQ notify job.
  - `ActivityNotifierProcessor` consumes jobs and delegates to `ActivityNotifierService`.
  - `ActivityNotifierService` loads monitored addresses from `UserAddressDao`, reads `ACTIVITY_FETCH_LIMIT` and `ACTIVITY_LOOKBACK_MS`, fetches recent activities, filters already-seen aggregated activity via `ActivityDao`, sends Telegram messages, persists only successfully sent activities, then prunes persisted activity older than 7 days.
  - `ActivityService.fetchActivities(userAddress, limit, fromTime)` groups raw records by `[timestamp, slug, outcome, side]`, sums `usdcSize` and `size`, calculates average price, sorts newest first, and returns normalized `PolymarketActivity` objects.
  - `ActivityDao` wraps the TypeORM repository for deduplication, persistence, and retention cleanup.
- `src/notification/` — `NotificationFormattingService` renders Telegram-supported HTML for an activity and optional profile; `TelegramService` broadcasts the message to all configured chat IDs in parallel and surfaces send failures.
- `src/user-address/` — manages watched Polymarket wallet addresses stored in the database. `UserAddressController` exposes `POST /user-addresses`, `DELETE /user-addresses/:address`, `GET /user-addresses`, and `PUT /user-addresses/profiles/refresh`, all protected by `AdminAuthGuard`. `UserManagerService.add()` fetches and stores the profile alongside the address.
- `src/auth/` — `AdminAuthGuard` compares the `x-admin-key` request header with `ADMIN_KEY_HASH` using bcrypt.

## Testing Patterns

Unit tests live alongside source files as `*.spec.ts` and run with `jest.unit.config.js`. E2E specs live in `test/*.e2e-spec.ts` and run serially with `jest.e2e.config.js`.

- Unit tests use `@suites/unit` / `@suites/di.nestjs` / `@suites/doubles.jest` for isolated units with mocked dependencies.
- Integration-style Nest tests can use `overrideProvider(...)` to replace external services while exercising real module wiring.
- `test/polymarket-activity.e2e-spec.ts` hits the live Polymarket API and is network-dependent.
- `test/notification.e2e-spec.ts` can send a real Telegram message and requires Telegram environment variables.
- DAO E2E tests depend on the configured PostgreSQL database.

## Key Domain Types

- `RawActivity` (`src/polymarket-api/polymarket-api.types.ts`) — Polymarket raw activity response; timestamps are Unix seconds and numeric trade fields include `usdcSize`, `size`, and `price`.
- `PolymarketActivity` (`src/activity/activity.entity.ts`) — TypeORM entity and normalized aggregated activity. Deduplication uses `[timestamp, marketSlug, outcomePurchased, side, userAddress]`.
- `Order` (`src/activity/activity.entity.ts`) — per-raw-trade breakdown stored on `PolymarketActivity.orders` as `{ tokenPrice, numTokens, priceUsdt }`.
