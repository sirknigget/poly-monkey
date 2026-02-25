# Task 01: Install axios and Define TypeScript Interfaces

Metadata:
- Dependencies: none
- Provides: src/research/polymarket-activity.service.ts (interfaces + stub class), package.json (axios dependency)
- Size: Small (1 file modified, 1 file created)

## Implementation Content

Install the `axios` runtime dependency and create the service file with the two TypeScript interfaces (`RawActivity` and `PolymarketActivity`) and a minimal stub class body. This unblocks the TypeScript build and defines the data contracts that all subsequent tasks depend on. No service logic is implemented in this task.

This combines work plan tasks T1 and T2 into a single commit because the interface file is meaningless without the dependency, and both tasks share the same build-verification criterion (`yarn build` exits zero).

## Target Files

- [x] `package.json` — add `axios` to `dependencies` (modified by `yarn add axios`)
- [x] `yarn.lock` — updated automatically by yarn (not hand-edited)
- [x] `src/research/polymarket-activity.service.ts` — new file with interfaces and stub class

## Implementation Steps

### 1. Red Phase

No failing tests are written in this task. The "failing" state is a build failure caused by the missing axios dependency. The build failure is the verification baseline.

- [x] Confirm current state: `yarn build` fails if any subsequent file already imports axios (it should not yet — the service file does not exist). If the build already passes, note that and proceed.
- [x] Confirm `axios` is absent from `package.json` `dependencies`.

### 2. Green Phase

- [x] Run `yarn add axios` in `/Users/omergilad/workspace/poly-monkey` (the project root).
- [x] Confirm `package.json` `dependencies` now contains `"axios"` with a version >= 1.0. If the installed version is below 1.0, stop and escalate — this indicates an unexpected resolution conflict.
- [x] Confirm `@types/axios` was NOT added (axios >= 1.x ships its own types; adding `@types/axios` separately would introduce a conflict).
- [x] Create `src/research/polymarket-activity.service.ts` with the following exact content:

```typescript
import { Injectable } from '@nestjs/common';
import axios from 'axios';

/** Shape of a single record returned by the Polymarket Data API */
interface RawActivity {
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

/** Aggregated, formatted activity returned by PolymarketActivityService */
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

@Injectable()
export class PolymarketActivityService {
  async fetchActivities(
    userAddress: string,
    limit = 100,
  ): Promise<PolymarketActivity[]> {
    // Implementation added in Task 02
    void axios;
    void userAddress;
    void limit;
    return [];
  }
}
```

The `void` expressions suppress the "declared but never read" TypeScript error on the stub. They will be removed in Task 02 when the full implementation replaces the stub body.

- [x] Run `yarn build` — confirm it exits zero.

### 3. Refactor Phase

No refactoring required for a stub and interface definitions.

## Completion Criteria

- [x] `axios` is present in `package.json` under `dependencies` (not `devDependencies`) with version >= 1.0.
- [x] `@types/axios` is absent from `package.json`.
- [x] `src/research/polymarket-activity.service.ts` exists and contains both `RawActivity` and `PolymarketActivity` interfaces with all fields matching the Design Doc Contract Definitions section exactly.
- [x] `PolymarketActivityService` class is exported and decorated with `@Injectable()`.
- [x] `yarn build` exits zero. (L3)

## Notes

- Impact scope: `package.json`, `yarn.lock`, `src/research/polymarket-activity.service.ts` (new).
- Constraints: Do not modify `src/app.module.ts`, `src/app.controller.ts`, `src/app.service.ts`, or `src/main.ts`.
- The `PolymarketActivity` interface must be `export`ed so the integration test at `test/polymarket-activity.e2e-spec.ts` can reference it via `ReturnType<PolymarketActivityService['fetchActivities']>`.
- `RawActivity` does not need to be exported (it is only used internally within the service).
