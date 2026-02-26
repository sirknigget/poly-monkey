# Task 05: Create activity.service.ts — Red→Green (all 6 unit test scenarios)

Metadata:
- Phase: 2
- Dependencies:
  - Task 04 → Deliverable: `src/polymarket-api/polymarket-api.module.ts`
  - Task 02 → Deliverable: `src/polymarket-api/polymarket-api.types.ts`
  - Existing Red skeleton: `src/activity/activity.service.spec.ts` (do NOT modify)
- Provides: `src/activity/activity.service.ts` (imported by Task 06 ActivityModule)
- Size: Small (1 implementation file; test file is pre-existing and must not be altered)

## Implementation Content

Implement `ActivityService` with the two-pass aggregation pipeline. The 6 unit test scenarios in
`src/activity/activity.service.spec.ts` are already written (Red state). This task makes all 6 pass
(Green) without modifying a single assertion.

Read the full test file at
`/Users/omergilad/workspace/poly-monkey/src/activity/activity.service.spec.ts`
before writing any code — the assertions define the exact contract.

Read the POC reference at
`/Users/omergilad/workspace/poly-monkey/src/research/polymarket-activity.service.ts`
for the algorithm logic; do not copy its structure (split methods) — unify into `formatGroup`.

### Two-pass pipeline summary

**Pass 1** — group raw records by `transactionHash` (fallback key: `unknown_<timestamp ?? 0>`).
For each group call `formatGroup(records, key)`. Produce an intermediate array of
`{ activity: PolymarketActivity; timestamp: number }` where `timestamp` is the numeric value from
the first record of the group (or 0 if absent). Do NOT format the `date` string yet.

**formatGroup(records, key)** — single unified function for both 1-record and n-record groups:
- `transactionHash`: the `key` parameter
- `totalPriceUsd`: `parseFloat(sum(usdcSize ?? 0 for each record).toFixed(2))`
- `numTokens`: `parseFloat(sum(size ?? 0 for each record).toFixed(2))`
- `avgPricePerToken`:
  - single record: `parseFloat((record.price ?? 0).toFixed(4))`
  - multiple records: `parseFloat((totalPriceUsd / totalSize === 0 ? 0 : totalPriceUsd / totalSize).toFixed(4))`
    where `totalSize` is the raw (unrounded) sum of `size` values
- `outcomePurchased`: `[...new Set(records.map(r => r.outcome ?? 'Unknown'))].sort().join(', ')`
- `date`: leave as a placeholder — set after pass 2 (see sort step)
- `eventTitle`: `first.title ?? 'Unknown Event'`
- `eventLink`: `first.eventSlug ? 'https://polymarket.com/event/' + first.eventSlug : 'N/A'`
- `marketSlug`: `first.slug ?? ''`
- `side`: `first.side ?? 'N/A'`
- `activityCount`: `records.length`

**Pass 2** — group the intermediate array by the composite key:
```
JSON.stringify([numericTimestamp, activity.marketSlug, activity.outcomePurchased, activity.side])
```
For each group of intermediates that share this key:
- `totalPriceUsd` = sum of all `activity.totalPriceUsd` values, rounded to 2dp
- `numTokens` = sum of all `activity.numTokens` values, rounded to 2dp
- `activityCount` = sum of all `activity.activityCount` values
- `avgPricePerToken` = `parseFloat((mergedTotalPriceUsd / mergedNumTokens).toFixed(4))` (or 0 if denominator is 0)
- `transactionHash` = from the first record in the group (input order)
- All other fields (`eventTitle`, `eventLink`, `marketSlug`, `side`, `outcomePurchased`) preserved from the first record

**Sort** the merged intermediate array by `timestamp` descending (numeric; missing = 0).

**Map to output** — only now format the `date` string:
```
timestamp ? new Date(timestamp * 1000).toLocaleString() : 'N/A'
```

### PolymarketActivity output type (11 fields)

This interface should live in `src/activity/activity.service.ts` or be imported from a sibling
types file. The unit tests use `ReturnType<ActivityService['fetchActivities']>` so they do not
need a direct import of this type.

```typescript
export interface PolymarketActivity {
  transactionHash: string;
  date: string;
  eventTitle: string;
  eventLink: string;
  marketSlug: string;
  outcomePurchased: string;
  side: string;
  totalPriceUsd: number;
  numTokens: number;
  avgPricePerToken: number;
  activityCount: number;
}
```

## Target Files

- [ ] `src/activity/activity.service.ts` (new)
- `src/activity/activity.service.spec.ts` — pre-existing, DO NOT MODIFY

## Implementation Steps

### 1. Red Phase — confirm tests are currently failing

Before writing any code, verify the test suite is in Red state:

```bash
cd /Users/omergilad/workspace/poly-monkey && npm test -- --testPathPattern=activity.service.spec 2>&1 | tail -20
```

Expected: compilation or import errors because `activity.service.ts` does not exist yet, or the
module cannot be resolved. At minimum one failure must be present.

Note: the spec imports `ActivityModule` from `./activity.module` which also does not exist yet.
The tests will fail at compile time. That is the correct Red state.

### 2. Green Phase — create activity.service.ts

Create `/Users/omergilad/workspace/poly-monkey/src/activity/activity.service.ts` implementing the
two-pass pipeline as described above.

The file needs:
- `import { Injectable } from '@nestjs/common'`
- `import { PolymarketApiService } from '../polymarket-api/polymarket-api.service'`
- `import { RawActivity } from '../polymarket-api/polymarket-api.types'`
- The `PolymarketActivity` interface (exported)
- The `ActivityService` class with `fetchActivities` and private `formatGroup`

The spec also imports `ActivityModule` from `./activity.module`. That module (Task 06) must exist
for the tests to compile. Since Task 06 is the next task, you have two options:

**Option A (recommended)**: Create a minimal stub `src/activity/activity.module.ts` in this same
commit to unblock test compilation, then Task 06 fills it in properly. However, the work plan
specifies T2a and T2b as separate commits. Do NOT do this — see Option B.

**Option B**: The spec cannot run until `activity.module.ts` exists. Task 06 is the very next task
and creates that file. Run the tests only after Task 06 is complete. The plan's Phase 2 completion
criteria specify running tests after both T2a and T2b commits, so this is correct.

Implement `activity.service.ts` in this commit. The Green verification (all 6 tests passing) is
confirmed after Task 06 creates the module.

### 3. Verify build (not yet full test run — ActivityModule missing)

```bash
cd /Users/omergilad/workspace/poly-monkey && npm run build
```

Expected: exits 0 (even though ActivityModule does not exist yet, the build picks up only files
it can resolve; `activity.service.ts` itself compiles cleanly because it only imports from
`polymarket-api/` which exists).

### 4. Verify lint

```bash
cd /Users/omergilad/workspace/poly-monkey && npm run lint
```

Expected: exits 0.

### 5. Verify no axios import and no direct instantiation

```bash
grep -n "import axios\|new PolymarketApiService" /Users/omergilad/workspace/poly-monkey/src/activity/activity.service.ts
```

Expected: no output.

## Completion Criteria

- [ ] `src/activity/activity.service.ts` created with `ActivityService` class
- [ ] Two-pass pipeline implemented with unified `formatGroup`
- [ ] No raw `axios` import; no `new PolymarketApiService()` direct instantiation
- [ ] Numeric `timestamp` kept on intermediate state through both passes; `date` formatted only after sort
- [ ] Composite key for pass 2 uses `JSON.stringify([numericTimestamp, marketSlug, outcomePurchased, side])`
- [ ] `transactionHash` of merged group = first record's hash in input order
- [ ] `avgPricePerToken` in merged group = `mergedTotalPriceUsd / mergedNumTokens` rounded to 4dp (not average of averages)
- [ ] `npm run build` exits 0 (L3 verification — full L2 test verification done after Task 06)
- [ ] `npm run lint` exits 0

## Notes

- Impact scope: new file only — nothing imports it yet.
- Constraints: Do not modify `src/activity/activity.service.spec.ts` assertions.
- Floating-point note: use `parseFloat(...toFixed(N))` for all rounding; the test fixtures are
  chosen so results are exact within floating-point representation.
- The `outcomePurchased` for a single-record group is still computed via
  `[...new Set([outcome ?? 'Unknown'])].sort().join(', ')` which correctly returns just the one
  outcome — no special-casing for single vs multi record.
