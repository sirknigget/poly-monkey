# Task 03: Create polymarket-api.service.ts (PolymarketApiService)

Metadata:
- Phase: 1
- Dependencies: Task 02 → Deliverable: `src/polymarket-api/polymarket-api.types.ts`
- Provides: `src/polymarket-api/polymarket-api.service.ts` (imported by Task 04 and Task 05)
- Size: Small (1 file)

## Implementation Content

Create `PolymarketApiService` — the injectable HTTP transport layer that replaces the raw `axios.get()`
call in the POC. The service accepts `HttpService` from `@nestjs/axios` via constructor injection and
exposes a single method `getActivities(userAddress, limit)` that issues the Polymarket Data API
request and returns `Promise<RawActivity[]>`.

Key constraints enforced by the work plan skill constraints:
- No `import axios from 'axios'` — `HttpService` only.
- Use `firstValueFrom(this.httpService.get<RawActivity[]>(...))` — no manual `.subscribe()`.
- `userAddress` is lowercased before being sent as the `user` query param.
- Return `response.data` directly — no error wrapping.

Reference the POC HTTP call at
`/Users/omergilad/workspace/poly-monkey/src/research/polymarket-activity.service.ts` lines 39–50
for the API URL and query parameters.

## Target Files

- [x] `src/polymarket-api/polymarket-api.service.ts` (new)

## Implementation Steps

### 1. Create the file

Create `/Users/omergilad/workspace/poly-monkey/src/polymarket-api/polymarket-api.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RawActivity } from './polymarket-api.types';

@Injectable()
export class PolymarketApiService {
  constructor(private readonly httpService: HttpService) {}

  async getActivities(
    userAddress: string,
    limit: number,
  ): Promise<RawActivity[]> {
    const response = await firstValueFrom(
      this.httpService.get<RawActivity[]>(
        'https://data-api.polymarket.com/activity',
        {
          params: {
            user: userAddress.toLowerCase(),
            limit,
            type: 'TRADE',
            sortBy: 'TIMESTAMP',
            sortDirection: 'DESC',
          },
        },
      ),
    );
    return response.data;
  }
}
```

### 2. Verify no axios direct import

```bash
grep -n "import axios" /Users/omergilad/workspace/poly-monkey/src/polymarket-api/polymarket-api.service.ts
```

Expected: no output (grep returns nothing).

### 3. Verify compilation

```bash
cd /Users/omergilad/workspace/poly-monkey && npm run build
```

Expected: exits 0.

### 4. Verify lint

```bash
cd /Users/omergilad/workspace/poly-monkey && npm run lint
```

Expected: exits 0.

## Completion Criteria

- [x] `src/polymarket-api/polymarket-api.service.ts` exists with `PolymarketApiService` class
- [x] `getActivities(userAddress: string, limit: number): Promise<RawActivity[]>` uses
  `firstValueFrom` and `HttpService` — no raw `axios` import present
- [x] `userAddress.toLowerCase()` applied before sending the `user` param
- [x] `npm run build` exits 0 (L3 verification)
- [ ] `npm run lint` exits 0

## Notes

- Impact scope: new file only — nothing else imports it yet.
- Constraints: Do not import `axios` directly. Do not add error handling wrappers around
  `response.data` — propagate errors as thrown by `firstValueFrom`.
- `rxjs` is already in `dependencies` (brought in by `@nestjs/core`); no additional install needed.
