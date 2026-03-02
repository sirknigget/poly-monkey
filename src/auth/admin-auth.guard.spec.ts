import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TestBed, Mocked } from '@suites/unit';
import { AdminAuthGuard } from './admin-auth.guard';

// bcrypt hash of 'test-admin-key' with 10 rounds
const TEST_ADMIN_KEY = 'test-admin-key';
const TEST_ADMIN_KEY_HASH =
  '$2b$10$m36LUCKPdH0jM2ICAKQ8LOLWZvCjIH6TFIT0WQu7MX7ArqnGieHje';

let guard: AdminAuthGuard;
let configService: Mocked<ConfigService>;

beforeAll(async () => {
  const { unit, unitRef } = await TestBed.solitary(AdminAuthGuard).compile();
  guard = unit;
  configService = unitRef.get(ConfigService);
});

afterEach(() => {
  jest.clearAllMocks();
});

function mockContext(headerValue: string | undefined): ExecutionContext {
  const headers: Record<string, string | undefined> = {
    'x-admin-key': headerValue,
  };
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

// ---------------------------------------------------------------------------
// Scenario 1 — Valid admin key
// ---------------------------------------------------------------------------
describe('AdminAuthGuard – Scenario 1: valid admin key', () => {
  it('returns true when the header matches the stored hash', async () => {
    configService.get.mockReturnValue(TEST_ADMIN_KEY_HASH);
    const result = await guard.canActivate(mockContext(TEST_ADMIN_KEY));
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Scenario 2 — Wrong admin key
// ---------------------------------------------------------------------------
describe('AdminAuthGuard – Scenario 2: wrong admin key', () => {
  it('throws UnauthorizedException when the header does not match the hash', async () => {
    configService.get.mockReturnValue(TEST_ADMIN_KEY_HASH);
    await expect(guard.canActivate(mockContext('wrong-key'))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 3 — Missing x-admin-key header
// ---------------------------------------------------------------------------
describe('AdminAuthGuard – Scenario 3: missing header', () => {
  it('throws UnauthorizedException when x-admin-key header is absent', async () => {
    configService.get.mockReturnValue(TEST_ADMIN_KEY_HASH);
    await expect(guard.canActivate(mockContext(undefined))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 4 — Missing ADMIN_KEY_HASH env var
// ---------------------------------------------------------------------------
describe('AdminAuthGuard – Scenario 4: missing ADMIN_KEY_HASH env var', () => {
  it('throws UnauthorizedException when ADMIN_KEY_HASH is not configured', async () => {
    configService.get.mockReturnValue(undefined);
    await expect(
      guard.canActivate(mockContext(TEST_ADMIN_KEY)),
    ).rejects.toThrow(UnauthorizedException);
  });
});
