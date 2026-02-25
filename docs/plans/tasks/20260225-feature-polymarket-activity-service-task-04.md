# Task 04: Verify Integration Test and Run Full Quality Gate

Metadata:
- Dependencies: task-03 — Deliverables: src/app.module.ts (ResearchModule imported)
- Provides: verification that all four quality gate commands exit zero
- Size: Small (0 new files; 0 existing files modified)

## Implementation Content

The integration test skeleton at `test/polymarket-activity.e2e-spec.ts` is already written and complete. This task:
1. Confirms the skeleton compiles and its imports resolve correctly.
2. Runs `yarn test:e2e` against the live Polymarket Data API and verifies all three `it` blocks pass.
3. Executes the full Phase 4 quality gate: `yarn lint`, `yarn build`, `yarn test`, `yarn test:e2e`.

If the skeleton does not compile or the assertions fail, root-cause the failure and fix the implementation (in `src/research/polymarket-activity.service.ts`) — not the test. The test assertions are the source of truth for AC compliance.

## Target Files

- [ ] No new files.
- [ ] `src/research/polymarket-activity.service.ts` — fix only if integration test reveals a bug in the implementation.

## Implementation Steps

### 1. Red Phase

- [ ] Open `test/polymarket-activity.e2e-spec.ts` and confirm the following imports resolve:
  - `PolymarketActivityService` from `../src/research/polymarket-activity.service`
  - `ResearchModule` from `../src/research/polymarket-activity.module`
- [ ] Run `yarn build` — confirm zero errors (imports in test files are checked by the TypeScript compiler when `test/` is included in compilation).
- [ ] Run `yarn test:e2e` for the first time. If all three `it` blocks pass on the first run, skip directly to the quality gate. If any block fails, proceed to the Green Phase.

### 2. Green Phase

Fix the service implementation if any of the three integration test assertions fail:

**"returns a non-empty array for the known test address"** — `expect(activities.length).toBeGreaterThan(0)`
- If this fails, the API call is not reaching the live endpoint or is returning an error. Check: correct URL (`https://data-api.polymarket.com/activity`), all five query parameters, the address is lowercased.

**"each item has all required fields present and non-null"** — all 11 fields `toBeDefined()` and `not.toBeNull()`
- If any field is `undefined` or `null`, find the missing field in the service implementation and verify its fallback value is applied on all code paths (single-record and multi-record).
- Fields that must never be `undefined` or `null`: `transactionHash`, `date`, `eventTitle`, `eventLink`, `marketSlug`, `outcomePurchased`, `side`, `totalPriceUsd`, `numTokens`, `avgPricePerToken`, `activityCount`.

**"returns at most the requested limit of activities"** — `expect(activities.length).toBeLessThanOrEqual(50)`
- If this fails, the `limit` parameter is not being passed correctly to the API. Confirm the `params` object includes `limit: 50` (the value passed in `beforeAll`).

- [ ] After any fix to the service, re-run `yarn build` (exits zero) then `yarn test:e2e` (all three pass).

### 3. Refactor Phase (Quality Gate)

Run the full quality gate in sequence. All four commands must exit zero.

- [ ] `yarn lint` — expect zero errors. If ESLint reports errors, fix the flagged issues (formatting, unused imports, etc.) in the affected service or module files.
- [ ] `yarn build` — expect zero TypeScript compilation errors.
- [ ] `yarn test` — expect all unit tests to pass. The existing `src/app.controller.spec.ts` must still pass.
- [ ] `yarn test:e2e` — expect both spec files to pass:
  - `test/app.e2e-spec.ts` — regression (same number of passing tests as pre-task baseline from task-03)
  - `test/polymarket-activity.e2e-spec.ts` — exactly 3 passing tests

**Design Doc AC Coverage Review**:
- [ ] Confirm each AC is either covered by a passing test or explicitly deferred per the AC Coverage Mapping table in the Design Doc:
  - Covered by integration test: non-empty result, field-shape (11 fields), limit boundary, DI injectability, AppModule regression.
  - Explicitly deferred (future unit test scope): FR-1 param verification, FR-2/FR-3 aggregation math with fixtures, FR-4 sort order with fixtures, FR-5 N/A edge cases.

**Skill Fidelity Verification**:
- [ ] `@Injectable()` is present on `PolymarketActivityService`.
- [ ] `@Module()` is present on `ResearchModule`.
- [ ] Single quotes and trailing commas are used throughout the new files (per `.prettierrc`).
- [ ] No secrets or hardcoded credentials in any committed file.
- [ ] axios HTTP call uses `https://` URL.
- [ ] `src/app.controller.ts`, `src/app.service.ts`, `src/main.ts` are unmodified.

## Completion Criteria

- [ ] `yarn lint` exits zero. (L3)
- [ ] `yarn build` exits zero. (L3)
- [ ] `yarn test` exits zero — `src/app.controller.spec.ts` passes. (L2)
- [ ] `yarn test:e2e` exits zero — both spec files pass. (L1)
  - [ ] `test/polymarket-activity.e2e-spec.ts` reports exactly 3 passing tests.
  - [ ] `test/app.e2e-spec.ts` reports the same number of passing tests as the pre-feature baseline.
- [ ] Live API call for address `0x2005d16a84ceefa912d4e380cd32e7ff827875ea` with `limit=50` returns a non-empty array.
- [ ] All 11 `PolymarketActivity` fields verified as defined and non-null on every returned item.
- [ ] Design Doc AC coverage confirmed — no AC marked "covered" unless a passing test exists.
- [ ] No secrets in any committed file.

## Notes

- Impact scope: `src/research/polymarket-activity.service.ts` (fix only if a test failure reveals a bug). No other files should be modified.
- Constraints: Do not modify `test/polymarket-activity.e2e-spec.ts`. The skeleton is the source of truth for acceptance criteria. If an assertion in the test seems wrong, raise it before changing it.
- This task requires outbound HTTPS access to `data-api.polymarket.com`. Run in an environment with internet access.
- `yarn format` (auto-fix) may be used to resolve formatting issues before running `yarn lint`. Run `yarn lint` again after formatting to confirm zero errors.
- If `yarn lint` auto-fixes files via `--fix` (the `lint` script in `package.json` includes `--fix`), confirm no unintended changes were introduced.
