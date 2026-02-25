# Overall Design Document: Polymarket Activity Service Feature

Generation Date: 2026-02-25
Target Plan Document: 20260225-feature-polymarket-activity-service.md

## Project Overview

### Purpose and Goals

Port the Python Polymarket activity tracker (`research/polymarket_activity_tracker.py`) into a NestJS injectable service. The service exposes a single stateless method `fetchActivities(userAddress, limit?)` that fetches raw trade records from the Polymarket Data API, groups them by transaction hash, aggregates multi-fill trades into single logical records, and returns the result sorted by timestamp descending.

### Background and Context

The Python script proves the Polymarket API integration works. Bringing that logic into NestJS makes it available to future features (notifications, analysis endpoints) through standard NestJS dependency injection. The work is scoped as a POC — stateless, no persistence, no deduplication between calls.

## Task Division Design

### Division Policy

Four tasks follow the work plan's phase structure and the natural dependency ordering of the implementation. Each task delivers one independently verifiable unit of work at commit granularity.

- **T1** installs the axios runtime dependency and creates the interface and stub (Phase 1). These two work plan tasks (T1 + T2) are combined into one commit because the interface file has no value without the dependency and they share a single build-verification criterion.
- **T2** implements the full service logic and the `ResearchModule` wrapper (Phase 2). These two work plan tasks (T3 + T4) are combined because the module is a trivial wrapper; splitting them produces a broken intermediate state where the service exists but cannot be injected.
- **T3** wires `ResearchModule` into `AppModule` and verifies the existing e2e test does not regress (Phase 3, T5). This is its own commit because it modifies an existing file (`app.module.ts`) and has a distinct regression-test verification step.
- **T4** completes the integration test execution for `polymarket-activity.e2e-spec.ts` and runs the full quality gate (Phase 3 T6 + Phase 4). The integration test skeleton is already written; T4's job is to confirm it compiles, passes against the live API, and that lint/build/test all exit zero.

Verification level distribution:
- T1: L3 (build succeeds)
- T2: L3 (build succeeds) + manual logic trace
- T3: L3 (build) + L1 (existing e2e regression)
- T4: L1 (full e2e suite) + L2 (unit tests)

### Inter-task Relationship Map

```
T1: Install axios + define interfaces + stub class
    Deliverable: src/research/polymarket-activity.service.ts (interfaces + stub)
                 package.json (axios in dependencies)
  |
  v
T2: Implement PolymarketActivityService + ResearchModule
    Deliverable: src/research/polymarket-activity.service.ts (full implementation)
                 src/research/polymarket-activity.module.ts (new file)
  |
  v
T3: Wire ResearchModule into AppModule (app.module.ts modification)
    Deliverable: src/app.module.ts (imports ResearchModule)
  |
  v
T4: Run integration test + full quality gate
    Deliverable: Verification that test/polymarket-activity.e2e-spec.ts passes
```

### Interface Change Impact Analysis

| Existing Interface | New Interface | Conversion Required | Corresponding Task |
|---|---|---|---|
| `AppModule.imports: []` | `AppModule.imports: [ResearchModule]` | Yes — add import | T3 |
| (none) | `RawActivity` interface | New | T1 |
| (none) | `PolymarketActivity` interface | New | T1 |
| (none) | `PolymarketActivityService.fetchActivities` | New | T2 |
| (none) | `ResearchModule` | New | T2 |

### Common Processing Points

- The `RawActivity` and `PolymarketActivity` interfaces defined in T1 are consumed by both the service implementation (T2) and the integration test (T4). They are co-located in the service file per Design Doc decision.
- There is no shared processing between tasks beyond the interface definitions. Each task builds on the deliverable of the previous one.

## Implementation Considerations

### Principles to Maintain Throughout

1. Follow NestJS conventions: `@Injectable()` on services, `@Module()` on modules, single quotes, trailing commas per `.prettierrc`.
2. HTTP errors from axios must propagate — no catch blocks around the `axios.get` call (fail-fast principle).
3. Division-by-zero guard on `avgPricePerToken`: return `0` when `totalSize === 0` in multi-record group.
4. No secrets in any committed file. The Polymarket Data API is public; no credentials are required.
5. All axios requests target HTTPS URLs only.
6. Files outside declared scope — `app.controller.ts`, `app.service.ts`, `main.ts`, `test/app.e2e-spec.ts` — must remain unmodified.

### Risks and Countermeasures

- Risk: axios version below 1.0 installed
  Countermeasure: Verify `package.json` shows `"axios": "^1.x.x"` or higher after install. Escalate if below 1.0.
- Risk: Integration test fails due to live network unavailability
  Countermeasure: Run `yarn test:e2e` only in environments with outbound HTTPS access. This is a POC constraint.
- Risk: TypeScript strict mode flags untyped axios response
  Countermeasure: Type the `axios.get` call as `axios.get<RawActivity[]>(url, { params })` to satisfy `strictNullChecks`.

### Impact Scope Management

- Allowed change scope: `src/research/` (new files), `src/app.module.ts` (import addition), `package.json` (axios dependency), `yarn.lock` (auto-updated by yarn).
- No-change areas: `src/app.controller.ts`, `src/app.service.ts`, `src/main.ts`, `test/app.e2e-spec.ts`, all existing unit tests in `src/`.
