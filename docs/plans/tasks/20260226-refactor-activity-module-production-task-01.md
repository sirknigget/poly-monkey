# Task 01: Install @nestjs/axios

Metadata:
- Phase: 0
- Dependencies: none
- Provides: updated package.json + yarn.lock (prerequisite for all subsequent tasks)
- Size: Small (0 source files, 1 package manifest change)

## Implementation Content

Run `yarn add @nestjs/axios` to add the package to `dependencies`. This makes `HttpModule` and
`HttpService` resolvable for all subsequent tasks. No source files are created or modified.

## Target Files

- [x] `package.json` (updated by yarn — verify `@nestjs/axios` appears in `dependencies`)
- [x] `yarn.lock` (updated by yarn automatically)

## Implementation Steps

### 1. Install the package

```bash
cd /Users/omergilad/workspace/poly-monkey
yarn add @nestjs/axios
```

### 2. Verify package.json

Confirm `@nestjs/axios` appears in the `dependencies` section (not `devDependencies`):

```bash
grep '@nestjs/axios' /Users/omergilad/workspace/poly-monkey/package.json
```

Expected output contains a line like:
```
"@nestjs/axios": "^4.0.0",
```

### 3. Verify build succeeds

```bash
cd /Users/omergilad/workspace/poly-monkey && yarn build
```

Expected: exits with code 0, no type errors.

## Completion Criteria

- [x] `package.json` `dependencies` section contains `@nestjs/axios`
- [x] `yarn build` exits 0 (L3 verification)

## Notes

- Impact scope: `package.json` and `package-lock.json` only — no source files touched.
- Constraints: Do not add `@nestjs/axios` to `devDependencies`; it is a production runtime dependency.
- `axios` is already listed in `dependencies` and is not removed — `@nestjs/axios` wraps it.
