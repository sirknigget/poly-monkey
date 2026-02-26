# Task 02: Create polymarket-api.types.ts (RawActivity interface)

Metadata:
- Phase: 1
- Dependencies: Task 01 (package.json must include @nestjs/axios, though this file does not import it)
- Provides: `src/polymarket-api/polymarket-api.types.ts` (imported by Task 03 and Task 05)
- Size: Small (1 file)

## Implementation Content

Create `src/polymarket-api/polymarket-api.types.ts` exporting the `RawActivity` interface with 10
optional fields. This is the shared type contract used by both `PolymarketApiService` (Task 03) and
`ActivityService` (Task 05). The POC equivalent lives in `src/research/polymarket-activity.service.ts`
as a private `interface RawActivity` — this task promotes it to a public export in its own file.

Reference the POC definition at `/Users/omergilad/workspace/poly-monkey/src/research/polymarket-activity.service.ts`
lines 6–16 for the field list.

## Target Files

- [x] `src/polymarket-api/polymarket-api.types.ts` (new)

## Implementation Steps

### 1. Create the directory

```bash
mkdir -p /Users/omergilad/workspace/poly-monkey/src/polymarket-api
```

### 2. Create the file

Create `/Users/omergilad/workspace/poly-monkey/src/polymarket-api/polymarket-api.types.ts`:

```typescript
/** Shape of a single record returned by the Polymarket Data API */
export interface RawActivity {
  transactionHash?: string;
  timestamp?: number;
  title?: string;
  eventSlug?: string;
  slug?: string;
  outcome?: string;
  side?: string;
  usdcSize?: number;
  size?: number;
  price?: number;
}
```

All 10 fields are optional (`?`) because the API may omit any of them.

### 3. Verify compilation

```bash
cd /Users/omergilad/workspace/poly-monkey && npm run build
```

Expected: exits 0. The new file is picked up by the TypeScript compiler and produces no errors.

### 4. Verify lint

```bash
cd /Users/omergilad/workspace/poly-monkey && npm run lint
```

Expected: exits 0.

## Completion Criteria

- [x] `src/polymarket-api/polymarket-api.types.ts` exists and exports `RawActivity` with exactly
  10 optional fields: `transactionHash`, `timestamp`, `title`, `eventSlug`, `slug`, `outcome`,
  `side`, `usdcSize`, `size`, `price`
- [x] `yarn build` exits 0 (L3 verification)
- [x] `yarn lint` exits 0 for new file (pre-existing failures in test/polymarket-activity.e2e-spec.ts unrelated to this task)

## Notes

- Impact scope: new file only — nothing else references it yet.
- Constraints: Do not add any imports or additional exports; this file is a pure type definition.
- Do not modify `src/research/polymarket-activity.service.ts` — the POC file is referenced for
  context only and is deleted in Task 08.
