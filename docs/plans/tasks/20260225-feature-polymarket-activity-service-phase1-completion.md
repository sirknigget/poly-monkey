# Phase 1 Completion: Dependency and Interfaces

## Phase Tasks Checklist

- [ ] task-01: Install axios and Define TypeScript Interfaces — COMPLETE

## E2E Verification Procedures (from Design Doc)

Run the following in order:

1. Run `yarn build` — expect zero errors.
2. Inspect `package.json`: confirm `"axios"` key is in `dependencies` (not `devDependencies`) with version >= 1.0.
3. Open `src/research/polymarket-activity.service.ts` and verify both interfaces are present with all fields matching the Design Doc Contract Definitions section:

   **RawActivity** (all fields optional):
   - `transactionHash?: string`
   - `timestamp?: number`
   - `title?: string`
   - `eventSlug?: string`
   - `slug?: string`
   - `outcome?: string`
   - `side?: string`
   - `usdcSize?: number`
   - `size?: number`
   - `price?: number`

   **PolymarketActivity** (all fields required):
   - `transactionHash: string`
   - `date: string`
   - `eventTitle: string`
   - `eventLink: string`
   - `marketSlug: string`
   - `outcomePurchased: string`
   - `side: string`
   - `totalPriceUsd: number`
   - `numTokens: number`
   - `avgPricePerToken: number`
   - `activityCount: number`

## Phase 1 Completion Criteria

- [ ] `axios` present in `package.json` `dependencies` (version >= 1.0, not in `devDependencies`)
- [ ] `@types/axios` absent from `package.json`
- [ ] `src/research/polymarket-activity.service.ts` exists with both interfaces defined (all fields present, matching Design Doc exactly)
- [ ] `PolymarketActivityService` class is exported and decorated with `@Injectable()`
- [ ] `yarn build` exits zero
