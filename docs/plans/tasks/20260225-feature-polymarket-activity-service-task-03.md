# Task 03: Wire ResearchModule into AppModule

Metadata:
- Dependencies: task-02 — Deliverables: src/research/polymarket-activity.service.ts (full implementation), src/research/polymarket-activity.module.ts
- Provides: src/app.module.ts (ResearchModule imported)
- Size: Small (1 file modified)

## Implementation Content

Add `ResearchModule` to the `imports` array of `AppModule` in `src/app.module.ts`. This makes `PolymarketActivityService` available application-wide through NestJS DI and satisfies FR-6. The existing `test/app.e2e-spec.ts` must continue to pass with no changes — confirming the root module wiring is not broken.

This is a separate commit from task-02 because it modifies an existing file that has an active regression test, and the verification step (running `yarn test:e2e`) is distinct from a build check.

## Target Files

- [ ] `src/app.module.ts` — add `ResearchModule` to `imports` array and add the import statement

## Implementation Steps

### 1. Red Phase

- [ ] Run `yarn test:e2e` before making any changes. Record the number of passing tests in `test/app.e2e-spec.ts`. This is the regression baseline. (The `polymarket-activity.e2e-spec.ts` integration test may fail at this point because the skeleton imports `ResearchModule` which exists after task-02 — that is acceptable; we are only baselining `app.e2e-spec.ts` here.)

### 2. Green Phase

- [ ] Open `src/app.module.ts`. The current content is:

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] Add the import statement for `ResearchModule` after the existing imports:

```typescript
import { ResearchModule } from './research/polymarket-activity.module';
```

- [ ] Add `ResearchModule` to the `imports` array in the `@Module` decorator:

```typescript
imports: [ResearchModule],
```

- [ ] The final file should be:

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ResearchModule } from './research/polymarket-activity.module';

@Module({
  imports: [ResearchModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

- [ ] Run `yarn build` — confirm it exits zero.

### 3. Refactor Phase

No refactoring required for a single-line addition.

- [ ] Run `yarn test:e2e` — confirm `test/app.e2e-spec.ts` passes with the same number of tests as the pre-change baseline. (`test/polymarket-activity.e2e-spec.ts` is verified in task-04.)

## Completion Criteria

- [ ] `src/app.module.ts` `imports` array contains `ResearchModule`.
- [ ] The `ResearchModule` import statement is present at the top of `src/app.module.ts`.
- [ ] `yarn build` exits zero. (L3)
- [ ] `yarn test:e2e` for `test/app.e2e-spec.ts` passes with no regression — same number of passing tests as the pre-change baseline. (L1)

## Notes

- Impact scope: `src/app.module.ts` (modified — import statement and `imports` array only).
- Constraints: Do not modify any other line in `src/app.module.ts`. Do not modify `src/app.controller.ts`, `src/app.service.ts`, `src/main.ts`, or any file under `test/`.
- The import path `./research/polymarket-activity.module` does not use a `.js` extension — consistent with the existing NestJS scaffold pattern observed in the project (no extensions used, ts-jest resolves without them).
