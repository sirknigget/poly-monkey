# Overall Design Document: Activity Module POC to Production

Generation Date: 2026-02-26
Target Plan Document: docs/plans/20260226-refactor-activity-module-production.md

## Project Overview

### Purpose and Goals

Promote the Polymarket activity service from the POC in `src/research/` into two production-ready
NestJS modules (`PolymarketApiModule` and `ActivityModule`) with an injectable HTTP layer, full
unit test coverage for aggregation logic, and a two-pass aggregation pipeline that eliminates
cross-transaction duplicates before results reach consumers.

### Background and Context

The POC service (`src/research/polymarket-activity.service.ts`) imports `axios` directly and mixes
HTTP transport with business logic. This blocks safe consumption by future modules. The promotion
extracts the HTTP layer into `PolymarketApiService` (injectable via `@nestjs/axios` `HttpService`),
unifies the `formatSingle`/`aggregateGroup` split into a single `formatGroup` function, and adds a
second grouping pass that merges records sharing the composite key
`(timestamp, marketSlug, outcomePurchased, side)` across different transaction hashes.

The E2E test skeleton (`test/polymarket-activity.e2e-spec.ts`) and unit test skeleton
(`src/activity/activity.service.spec.ts`) are already committed and reference the new module paths.
The implementation tasks make those tests green without modifying any test assertions.

## Task Division Design

### Division Policy

Horizontal slice: each task is one layer or one logical change, delivered as one commit. Tasks are
ordered strictly by dependency so that the app compiles and `test/app.e2e-spec.ts` passes after
every commit.

Verifiability levels used:
- L3 (build success) for type-only and module-wiring tasks with no executable business logic
- L2 (test passes) for tasks that include or activate test suites
- L1 (functional E2E) for the wiring and cleanup tasks that reconnect the running app

### Inter-task Relationship Map

```
Task 01: npm install @nestjs/axios
  → Deliverable: updated package.json / package-lock.json
  ↓
Task 02: polymarket-api.types.ts (RawActivity interface)
  → Deliverable: src/polymarket-api/polymarket-api.types.ts
  ↓
Task 03: polymarket-api.service.ts (PolymarketApiService)
  → Deliverable: src/polymarket-api/polymarket-api.service.ts
  → References: Task 02 deliverable (RawActivity)
  ↓
Task 04: polymarket-api.module.ts (PolymarketApiModule)
  → Deliverable: src/polymarket-api/polymarket-api.module.ts
  → References: Task 03 deliverable (PolymarketApiService)
  ↓
Task 05: activity.service.ts + activity.service.spec.ts Green
  → Deliverable: src/activity/activity.service.ts
  → References: Task 02 (RawActivity), Task 04 (PolymarketApiModule/PolymarketApiService)
  → Existing: src/activity/activity.service.spec.ts (Red skeleton — do not modify)
  ↓
Task 06: activity.module.ts (ActivityModule)
  → Deliverable: src/activity/activity.module.ts
  → References: Task 04 (PolymarketApiModule), Task 05 (ActivityService)
  ↓
Task 07: app.module.ts — swap ResearchModule → ActivityModule
  → Modifies: src/app.module.ts
  → References: Task 06 deliverable (ActivityModule)
  ↓
Task 08: Delete src/research/
  → Deletes: src/research/polymarket-activity.service.ts
             src/research/polymarket-activity.module.ts
  → References: Task 07 (AppModule no longer imports ResearchModule)
  ↓
Task 09: Verify/fix test/polymarket-activity.e2e-spec.ts imports and run E2E
  → Verifies: test/polymarket-activity.e2e-spec.ts (pre-generated, likely no edits needed)
  → References: Task 06 (ActivityModule), Task 05 (ActivityService)
```

Phase completion tasks (generated because the plan uses "Phase" notation):
- phase0-completion.md — after Task 01
- phase1-completion.md — after Task 04
- phase2-completion.md — after Task 06
- phase3-completion.md — after Task 09
- phase4-completion.md — quality assurance gate

### Interface Change Impact Analysis

| Existing Interface | New Interface | Conversion Required | Task |
|---|---|---|---|
| `PolymarketActivityService.fetchActivities` (research/) | `ActivityService.fetchActivities` (activity/) | Yes — AppModule consumer | Task 07 |
| `ResearchModule` import in AppModule | `ActivityModule` import in AppModule | Yes | Task 07 |
| `formatSingle` + `aggregateGroup` (private, POC) | `formatGroup` (unified, private, new) | Implementation only | Task 05 |
| `axios.get()` (direct, POC) | `HttpService.get()` via `firstValueFrom` | New file | Task 03 |

### Common Processing Points

- `RawActivity` interface defined once in `src/polymarket-api/polymarket-api.types.ts` (Task 02)
  and imported by `PolymarketApiService` (Task 03) and `ActivityService` (Task 05).
- `PolymarketActivity` interface currently defined in `src/research/polymarket-activity.service.ts`.
  The unit test spec (`src/activity/activity.service.spec.ts`) imports `ActivityService` only and
  uses `ReturnType<ActivityService['fetchActivities']>` — no separate import of `PolymarketActivity`.
  The new `ActivityService` must export this type or the E2E spec's `ReturnType<>` usage works via
  inference. Keep `PolymarketActivity` in `src/activity/activity.service.ts` or a separate types
  file in the activity module — the tests do not import it directly.

## Implementation Considerations

### Principles to Maintain Throughout

1. No raw `axios` import in any new production file — `HttpService` from `@nestjs/axios` only.
2. No direct `new PolymarketApiService()` — constructor DI only.
3. `formatGroup` is the single aggregation function; no `formatSingle`/`aggregateGroup` split.
4. Numeric `timestamp` stays on intermediate state through both passes; `date` string formatted
   only after pass 2 sort is complete.
5. TypeScript strict mode (`strictNullChecks`, `noImplicitAny`) applies to all new files.
6. Each commit must pass `npm run build` before it is made.

### Risks and Countermeasures

- Risk: `firstValueFrom(observable)` pattern new to codebase; unit tests for `ActivityService`
  mock `PolymarketApiService.getActivities` at the boundary, so misconfiguration surfaces
  immediately in Task 05.
- Risk: Intermediate `date` formatting too early breaks pass 2 composite key comparison.
  Countermeasure: Scenario 3 unit test (cross-transaction merge) directly catches this.
- Risk: `ResearchModule` deleted before `AppModule` swap leaves app broken mid-implementation.
  Countermeasure: Strict task order — Task 07 (swap) before Task 08 (delete).

### Impact Scope Management

- Allowed change scope per task is documented in each task file.
- `test/polymarket-activity.e2e-spec.ts` and `src/activity/activity.service.spec.ts` assertions
  must not be modified in any task.
- `test/app.e2e-spec.ts` must continue to pass after every commit from Task 07 onwards.
