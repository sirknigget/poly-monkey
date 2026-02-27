# Activity Merge Refactor — Design Document

## Overview

Refactor `ActivityService` and related types based on empirical analysis of live Polymarket API data. Two changes: simplify the merge pipeline from two passes to one, and expose raw fill details as an `orders` list on the output type instead of hiding them behind a single averaged price.

---

## Background

### Current architecture (before this change)

`ActivityService.fetchActivities` runs a three-step pipeline:

1. **`groupByTransactionHash`** — groups `RawActivity[]` by `transactionHash`, collecting records that share the same on-chain tx into one bucket.
2. **`buildIntermediates`** — calls `formatGroup` on each bucket, aggregating `usdcSize` → `totalPriceUsd` and `size` → `numTokens`, and producing a `PartialActivity`.
3. **`mergeIntermediates`** — groups the resulting intermediates by composite key `[timestamp, marketSlug, outcomePurchased, side]`, merging items that share the key into a single activity.

The final output is `PolymarketActivity[]` sorted descending by timestamp.

Relevant source files:
- `src/activity/activity.service.ts` — pipeline implementation
- `src/activity/activity.types.ts` — `PolymarketActivity` output type
- `src/polymarket-api/polymarket-api.types.ts` — `RawActivity` input type (fields all optional)
- `src/notification/notification-formatting.service.ts` — renders a `PolymarketActivity` to HTML for Telegram

### What empirical analysis revealed

A research script (`test/activity-research.ts`) was run against 1000 live records:

- **Records per tx hash**: 98.8% of tx hashes have exactly 1 raw record. A small fraction have 2–4 records — these are atomic multi-fill transactions where one on-chain tx settles multiple maker orders simultaneously. Within any tx hash group, `slug`, `outcome`, `timestamp`, and `side` are always identical; only `price`, `size`, and `usdcSize` vary per fill.
- **Secondary merge frequency**: ~10% of intermediates participate in a secondary merge, with groups as large as 49 transactions. All merge candidates are bot-placed orders — one tx per Polygon block (~2 second block time), with fills from a single order settling in the same block (same timestamp).
- **Timestamp granularity**: exact-second grouping is correct. 2-second granularity was considered and rejected — the data shows distinct intentional orders placed every 2 seconds on the same market; relaxing to 2s would cascade-merge them.
- **Price within a merge group**: typically uniform across fills. One group per 1000 records had mixed prices (e.g., 0.73 / 0.7382 / 0.74) — a sweep across consecutive ask levels.

### Why pass 1 is redundant

Since `slug`, `outcome`, `timestamp`, and `side` are invariant within a tx hash group, records sharing a tx hash always produce the same composite key. Pass 1 (group by tx hash) is fully subsumed by pass 2b (group by composite key). A single pass over raw records produces identical results.

**Behavioral note**: the old design grouped by tx hash first, which could — in theory — merge two raw records sharing a tx hash but with different `outcome` values into one activity with `outcomePurchased: 'No, Yes'`. The new design groups by composite key which includes `outcome`, so records with different outcomes always become separate activities regardless of tx hash. Empirically this scenario (same tx hash, different outcome) was never observed in live data.

---

## Changes

### 1. Single-pass merge in `ActivityService`

Replace the three private methods (`groupByTransactionHash`, `buildIntermediates`, `mergeIntermediates`) with a single grouping pass over raw records.

**Composite key** (same semantics as before, now applied directly to raw records):
```
JSON.stringify([
  record.timestamp ?? 0,
  record.slug ?? '',
  record.outcome ?? 'Unknown',
  record.side ?? 'N/A',
])
```

**Per-group aggregation**:
- `totalPriceUsd` = `parseFloat(sum(record.usdcSize ?? 0).toFixed(2))`
- `numTokens` = `parseFloat(sum(record.size ?? 0).toFixed(2))`
- `avgPricePerToken` = `parseFloat((numTokens === 0 ? 0 : totalPriceUsd / numTokens).toFixed(4))`
- `transactionHashes` = all non-undefined `record.transactionHash` values in the group (preserve insertion order, no dedup needed since each raw record has its own hash)
- `outcomePurchased` = `first.outcome ?? 'Unknown'` (outcome is invariant within a group; no Set/sort/join needed)
- `eventTitle` = `first.title ?? 'Unknown Event'`
- `eventLink` = `first.eventSlug ? 'https://polymarket.com/event/${first.eventSlug}' : 'N/A'`
- `marketSlug` = `first.slug ?? ''`
- `side` = `first.side ?? 'N/A'`
- `activityCount` = number of raw records in the group
- `orders` = one `Order` per raw record (see §2)
- `timestamp` = `first.timestamp ?? 0` (kept internally for sort; not on the output type)

Sort the resulting activities descending by `timestamp` before returning. Convert timestamp to `date` string: `timestamp ? new Date(timestamp * 1000).toLocaleString() : 'N/A'`.

### 2. `Order` type and `orders` field

Add `Order` to `src/activity/activity.types.ts`:

```ts
export interface Order {
  tokenPrice: number;   // source: RawActivity.price ?? 0
  numTokens: number;    // source: RawActivity.size ?? 0
  priceUsdt: number;    // source: RawActivity.usdcSize ?? 0
}
```

Each raw `RawActivity` record in a group becomes exactly one `Order`. The `orders` array preserves the original record order within the group.

### 3. Updated `PolymarketActivity` type

Replace the existing type in `src/activity/activity.types.ts`:

```ts
export interface PolymarketActivity {
  transactionHashes: string[];   // was: transactionHash: string
  date: string;
  eventTitle: string;
  eventLink: string;
  marketSlug: string;
  outcomePurchased: string;
  side: string;
  totalPriceUsd: number;
  numTokens: number;
  avgPricePerToken: number;      // totalPriceUsd / numTokens, 4dp
  activityCount: number;         // orders.length
  orders: Order[];
}
```

### 4. Notification formatting

Update `NotificationFormattingService.format()` in `src/notification/notification-formatting.service.ts`.

**Rule**: if all orders share the same `tokenPrice`, render a single price line (existing behaviour). If prices differ, render the weighted average followed by a compact per-level breakdown line.

**Single price level** (unchanged):
```
📊 Avg Price: $0.6800
```

**Multiple price levels**:
```
📊 Avg Price: $0.7395
   ↳ $0.7300 × 8.00t · $0.7382 × 40.00t · $0.7400 × 393.00t
```

Algorithm for the breakdown:
1. Group `orders` by `tokenPrice`, summing `numTokens` per level.
2. Sort levels ascending by `tokenPrice`.
3. Format each level as `$X.XXXX × Y.YYt` (price: 4dp, tokens: 2dp).
4. Join with ` · ` and prefix with `   ↳ `.

The `📊 Avg Price:` line always shows `avgPricePerToken` from the activity (4dp), regardless of single or multi-price.

### 5. Out of scope

- Any change to the Polymarket API fetch layer (`src/polymarket-api/`).
- Persistence or deduplication.

---

## Files affected

| File | Change |
|---|---|
| `src/activity/activity.types.ts` | Add `Order` interface; replace `transactionHash: string` with `transactionHashes: string[]`; add `orders: Order[]` |
| `src/activity/activity.service.ts` | Replace three-method pipeline with single-pass grouping |
| `src/activity/activity.service.spec.ts` | Update fixtures and assertions — see spec notes below |
| `test/polymarket-activity.e2e-spec.ts` | Update field assertions — see spec notes below |
| `src/notification/notification-formatting.service.ts` | Add per-level price breakdown for multi-price groups |
| `src/notification/notification-formatting.service.spec.ts` | Update `FULL_ACTIVITY` fixture; add multi-price scenario |

---

## Spec notes

### `activity.service.spec.ts`

The existing tests cover the correct behaviours; update field references and add `orders` assertions:

- Replace all `result[0].transactionHash` assertions with `result[0].transactionHashes`.
- The cross-transaction merge test currently asserts `transactionHash === '0xAAA'`. Update to assert `transactionHashes` contains both `'0xAAA'` and `'0xBBB'`.
- The multi-record group test (two records at `0xBBB` with outcomes `'Yes'` and `'No'`) will now produce **two** separate activities instead of one, because `outcome` is part of the composite key. Update the test to expect `result.length === 2`.
- Add an assertion on `orders` shape in the single-record test: `orders` has length 1, with `tokenPrice === 0.5`, `numTokens === 21.0`, `priceUsdt === 10.5`.
- Add an assertion on `orders` shape in the cross-transaction merge test: `orders` has length 2, each entry matching the corresponding raw record's price/size/usdcSize.

### `notification-formatting.service.spec.ts`

- Update `FULL_ACTIVITY` fixture: replace `transactionHash: '0xAAA'` with `transactionHashes: ['0xAAA']`; add `orders: [{ tokenPrice: 0.5, numTokens: 21.0, priceUsdt: 10.5 }]`.
- All existing scenario assertions remain valid (they test fields unaffected by this change).
- Add a new scenario for multi-price formatting: an activity with `orders` at two distinct `tokenPrice` values. Assert the output contains the `↳` breakdown line and does not contain it when all prices are equal.

### `test/polymarket-activity.e2e-spec.ts`

- Replace the `transactionHash` defined/non-null assertion with an assertion that `transactionHashes` is a non-empty array.

---

## Key invariants (verified empirically)

- Within a composite key group: `slug`, `outcome`, `timestamp`, `side` are always identical across records (including across tx hash boundaries).
- Timestamp is Unix seconds (10-digit). Convert to display date with `new Date(timestamp * 1000).toLocaleString()`.
- Merge timestamp granularity: exact second. Relaxing to 2s would incorrectly merge consecutive bot orders placed one Polygon block apart.
- `avgPricePerToken` formula: `totalPriceUsd / numTokens` (weighted average across all fills in the group).
