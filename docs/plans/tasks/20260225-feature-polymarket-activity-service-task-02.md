# Task 02: Implement PolymarketActivityService and ResearchModule

Metadata:
- Dependencies: task-01 — Deliverables: src/research/polymarket-activity.service.ts (interfaces + stub), package.json (axios dependency)
- Provides: src/research/polymarket-activity.service.ts (full implementation), src/research/polymarket-activity.module.ts (new file)
- Size: Small (2 files)

## Implementation Content

Replace the stub body in `PolymarketActivityService.fetchActivities` with the full fetch-aggregate pipeline ported from the Python reference implementation (`research/polymarket_activity_tracker.py`). Then create `ResearchModule` which declares and exports the service.

This combines work plan tasks T3 and T4 into a single commit. The module is a trivial three-line wrapper. Splitting them would leave a broken intermediate state where the service exists but cannot be injected.

Reference files for the aggregation algorithm:
- `research/polymarket_activity_tracker.py:aggregate_activities` — grouping key, sum/collect/average logic
- `research/polymarket_activity_tracker.py:_format_activity` — single-record output field mapping
- `research/polymarket_activity_tracker.py:_format_timestamp` — Unix timestamp to readable date
- `research/polymarket_activity_tracker.py:_construct_event_link` — URL construction

## Target Files

- [x] `src/research/polymarket-activity.service.ts` — replace stub body with full implementation
- [x] `src/research/polymarket-activity.module.ts` — new file

## Implementation Steps

### 1. Red Phase

There are no automated failing tests to write in this task (unit tests for aggregation logic are out of scope for this POC per the Design Doc AC Coverage Mapping table). The "failing" state is the stub returning an empty array. The correctness criterion is a manual logic trace against the Python reference.

- [x] Read `research/polymarket_activity_tracker.py` methods `fetch_activity`, `aggregate_activities`, `_format_activity`, `_format_timestamp`, and `_construct_event_link` before writing the TypeScript port.
- [x] List the five query parameters expected by the API: `user` (lowercased address), `limit`, `type=TRADE`, `sortBy=TIMESTAMP`, `sortDirection=DESC`. Verify these match the Python `params` dict in `fetch_activity`.
- [x] Note the grouping key fallback: `transactionHash ?? 'unknown_' + (timestamp ?? 0)`.
- [x] Note the division-by-zero guard: when `totalSize === 0`, `avgPricePerToken` must be `0`.
- [x] Note that `side` comes from the first record of the group and defaults to `'N/A'` when absent.

### 2. Green Phase

**Service implementation** — replace the stub body in `src/research/polymarket-activity.service.ts`:

The full method body must implement the following algorithm:

1. Call `axios.get<RawActivity[]>('https://data-api.polymarket.com/activity', { params: { user: userAddress.toLowerCase(), limit, type: 'TRADE', sortBy: 'TIMESTAMP', sortDirection: 'DESC' } })`. Do not wrap this call in a try-catch — axios errors must propagate to the caller.

2. Group raw records by `transactionHash`. For each record, the key is `record.transactionHash ?? 'unknown_' + (record.timestamp ?? 0)`.

3. For each group:
   - If the group has exactly one record: format it as a `PolymarketActivity` using the field mapping below (single-record path).
   - If the group has multiple records: aggregate using the multi-record path.

4. **Single-record field mapping**:
   - `transactionHash`: the grouping key (either `record.transactionHash` or the `unknown_` fallback)
   - `date`: `record.timestamp ? new Date(record.timestamp * 1000).toLocaleString() : 'N/A'`
   - `eventTitle`: `record.title ?? 'Unknown Event'`
   - `eventLink`: `record.eventSlug ? 'https://polymarket.com/event/' + record.eventSlug : 'N/A'`
   - `marketSlug`: `record.slug ?? ''`
   - `outcomePurchased`: `record.outcome ?? 'Unknown'`
   - `side`: `record.side ?? 'N/A'`
   - `totalPriceUsd`: `parseFloat((record.usdcSize ?? 0).toFixed(2))`
   - `numTokens`: `parseFloat((record.size ?? 0).toFixed(2))`
   - `avgPricePerToken`: `parseFloat((record.price ?? 0).toFixed(4))`
   - `activityCount`: `1`

5. **Multi-record aggregation**:
   - `totalUsdcSize` = sum of `record.usdcSize ?? 0` across all records in the group
   - `totalSize` = sum of `record.size ?? 0` across all records in the group
   - `avgPrice` = `totalSize === 0 ? 0 : totalUsdcSize / totalSize`
   - `outcomePurchased`: collect unique values of `record.outcome ?? 'Unknown'` from the group, sort them (for deterministic output), join with `', '`
   - `side`: `records[0].side ?? 'N/A'` (first record of the group)
   - `date`, `eventTitle`, `eventLink`, `marketSlug`: derived from the first record of the group using the same rules as single-record path
   - `transactionHash`: the grouping key
   - `totalPriceUsd`: `parseFloat(totalUsdcSize.toFixed(2))`
   - `numTokens`: `parseFloat(totalSize.toFixed(2))`
   - `avgPricePerToken`: `parseFloat(avgPrice.toFixed(4))`
   - `activityCount`: number of records in the group

6. Sort the result array by timestamp descending. Since `timestamp` is not on the output interface, use the raw first record's `timestamp` for sort comparison. Records without a timestamp sort to the end (treat missing timestamp as `0` for sort purposes).

7. Return the sorted `PolymarketActivity[]`.

- [x] Implement the above algorithm in `src/research/polymarket-activity.service.ts`, replacing the stub body.
- [x] Remove the `void` suppressor expressions from the stub.
- [x] Run `yarn build` — confirm it exits zero.

**Module implementation** — create `src/research/polymarket-activity.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PolymarketActivityService } from './polymarket-activity.service';

@Module({
  providers: [PolymarketActivityService],
  exports: [PolymarketActivityService],
})
export class ResearchModule {}
```

- [x] Create the file with the exact content above.
- [x] Run `yarn build` — confirm it exits zero.

### 3. Refactor Phase

- [x] Re-read `polymarket-activity.service.ts` and verify the method is not too long. If the grouping, formatting, and aggregation logic is all inline, extract private helper methods (`private formatSingle`, `private aggregateGroup`) to match the separation between `_format_activity` and `aggregate_activities` in the Python reference. This is optional at POC stage but improves readability.
- [x] Confirm all added tests still pass: `yarn build` exits zero.

## Completion Criteria

- [x] `PolymarketActivityService.fetchActivities` is fully implemented:
  - [x] API URL is `https://data-api.polymarket.com/activity` (HTTPS).
  - [x] All five query parameters are present: `user` (lowercased), `limit`, `type=TRADE`, `sortBy=TIMESTAMP`, `sortDirection=DESC`.
  - [x] Grouping key fallback `unknown_<timestamp>` is implemented.
  - [x] Single-record path populates all 11 `PolymarketActivity` fields.
  - [x] Multi-record path sums `usdcSize`, sums `size`, collects unique outcomes, computes average price.
  - [x] Division-by-zero guard on `avgPricePerToken` is present.
  - [x] Result is sorted by timestamp descending; missing timestamp treated as `0`.
  - [x] No try-catch wrapping the `axios.get` call.
- [x] `ResearchModule` exists with `providers: [PolymarketActivityService]` and `exports: [PolymarketActivityService]`.
- [x] `yarn build` exits zero. (L3)
- [x] Manual trace confirms field-level equivalence with the Python reference for each of: API URL, all five query parameters, grouping key logic, aggregation math, all field defaults.

## Notes

- Impact scope: `src/research/polymarket-activity.service.ts` (modified), `src/research/polymarket-activity.module.ts` (new).
- Constraints: Do not modify `src/app.module.ts`, `src/app.controller.ts`, `src/app.service.ts`, `src/main.ts`, or any file under `test/`.
- The `toFixed()` + `parseFloat()` pattern produces correctly rounded numbers without floating-point drift (e.g., `parseFloat((1.005).toFixed(2))` = `1`). This matches the Python `round()` semantics for typical values.
- axios >= 1.x ships its own TypeScript types; do not add `@types/axios`.
- The `fills` array present in the Python multi-record aggregate output is deliberately omitted from the TypeScript `PolymarketActivity` interface per Design Doc Non-Scope.
