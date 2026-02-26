# Task 04: Create polymarket-api.module.ts (PolymarketApiModule)

Metadata:
- Phase: 1
- Dependencies: Task 03 → Deliverable: `src/polymarket-api/polymarket-api.service.ts`
- Provides: `src/polymarket-api/polymarket-api.module.ts` (imported by Task 06 ActivityModule)
- Size: Small (1 file)

## Implementation Content

Create `PolymarketApiModule` — the NestJS module that wires `HttpModule` and `PolymarketApiService`
together and exports the service for injection by other modules. `ActivityModule` (Task 06) will
import this module to obtain `PolymarketApiService` without needing to know about `HttpModule`.

Module structure required by FR-1 acceptance criteria:
```
imports:   [HttpModule]          — from @nestjs/axios
providers: [PolymarketApiService]
exports:   [PolymarketApiService]
```

## Target Files

- [ ] `src/polymarket-api/polymarket-api.module.ts` (new)

## Implementation Steps

### 1. Create the file

Create `/Users/omergilad/workspace/poly-monkey/src/polymarket-api/polymarket-api.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PolymarketApiService } from './polymarket-api.service';

@Module({
  imports: [HttpModule],
  providers: [PolymarketApiService],
  exports: [PolymarketApiService],
})
export class PolymarketApiModule {}
```

### 2. Verify compilation

```bash
cd /Users/omergilad/workspace/poly-monkey && npm run build
```

Expected: exits 0.

### 3. Verify lint

```bash
cd /Users/omergilad/workspace/poly-monkey && npm run lint
```

Expected: exits 0.

## Completion Criteria

- [ ] `src/polymarket-api/polymarket-api.module.ts` exists and declares `PolymarketApiModule`
- [ ] Module imports `HttpModule` from `@nestjs/axios`, provides and exports `PolymarketApiService`
- [ ] `npm run build` exits 0 (L3 verification)
- [ ] `npm run lint` exits 0

## Notes

- Impact scope: new file only — no existing files import it yet.
- Constraints: Do not add `PolymarketApiModule` to `AppModule` in this task; that is done in
  Task 07. This task is foundation-only.
- `HttpModule` is the default (no-config) version; do not pass `HttpModule.register({...})`
  unless the design doc specifies a base URL or timeout (it does not).
