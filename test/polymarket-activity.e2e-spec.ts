import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ActivityService } from '../src/activity/activity.service';
import { PolymarketApiModule } from '../src/polymarket-api/polymarket-api.module';
import {
  cleanPolymarketMock,
  configureMockPolymarketEnv,
  mockPolymarketApis,
  PolymarketMock,
} from './polymarket-e2e-mock';

const TEST_ADDRESS = '0x2005d16a84ceefa912d4e380cd32e7ff827875ea';
const ONE_HOUR_MS = 60 * 60 * 1000;

describe('PolymarketActivityService (integration)', () => {
  let module: TestingModule;
  let service: ActivityService;
  let polymarketMock: PolymarketMock | undefined;
  let activities: Awaited<ReturnType<ActivityService['fetchActivities']>>;

  beforeAll(async () => {
    configureMockPolymarketEnv();
    polymarketMock = mockPolymarketApis();

    module = await Test.createTestingModule({
      imports: [PolymarketApiModule],
      providers: [ActivityService, Logger],
    }).compile();

    const app = module.createNestApplication();
    app.useLogger(new Logger());

    service = module.get(ActivityService);

    const fromTime = polymarketMock ? Date.now() - ONE_HOUR_MS : 0;

    // Single API call shared across all assertions — avoids redundant network requests.
    // In live mode, the address is known-active; in mock mode, the fixture is non-empty.
    activities = await service.fetchActivities(TEST_ADDRESS, 150, fromTime);
  });

  afterAll(async () => {
    cleanPolymarketMock();
    await module?.close();
  });

  it('returns a non-empty array for the known test address', () => {
    expect(Array.isArray(activities)).toBe(true);
    expect(activities.length).toBeGreaterThan(0);
  });

  it('each item has all required fields present and non-null', () => {
    for (const item of activities) {
      expect(Array.isArray(item.transactionHashes)).toBe(true);
      expect(item.transactionHashes.length).toBeGreaterThan(0);

      expect(item.eventTitle).toBeDefined();
      expect(item.eventTitle).not.toBeNull();

      expect(item.side).toBeDefined();
      expect(item.side).not.toBeNull();

      expect(item.totalPriceUsd).toBeDefined();
      expect(item.totalPriceUsd).not.toBeNull();

      expect(item.numTokens).toBeDefined();
      expect(item.numTokens).not.toBeNull();

      expect(item.outcomePurchased).toBeDefined();
      expect(item.outcomePurchased).not.toBeNull();

      expect(item.timestamp).toBeDefined();
      expect(item.timestamp).not.toBeNull();

      expect(item.eventLink).toBeDefined();
      expect(item.eventLink).not.toBeNull();

      expect(item.marketSlug).toBeDefined();
      expect(item.marketSlug).not.toBeNull();

      expect(item.avgPricePerToken).toBeDefined();
      expect(item.avgPricePerToken).not.toBeNull();

      expect(item.activityCount).toBeDefined();
      expect(item.activityCount).not.toBeNull();
    }
  });

  it('returns at most the requested limit of activities', () => {
    expect(activities.length).toBeLessThanOrEqual(150);
  });

  it('uses a sizeable varied fixture in mock mode', () => {
    if (!polymarketMock) return;

    expect(polymarketMock.getRawActivities().length).toBeGreaterThanOrEqual(
      120,
    );
    expect(polymarketMock.getRecentRawActivities().length).toBeGreaterThan(80);
    expect(activities).toHaveLength(
      polymarketMock.getRecentAggregatedActivityCount(),
    );
    expect(activities.length).toBeLessThan(
      polymarketMock.getAggregatedActivityCount(),
    );
    expect(new Set(activities.map((activity) => activity.side))).toEqual(
      new Set(['BUY', 'SELL']),
    );
    expect(
      new Set(activities.map((activity) => activity.outcomePurchased)),
    ).toEqual(new Set(['Yes', 'No']));
    expect(activities.some((activity) => activity.activityCount > 1)).toBe(
      true,
    );
    expect(polymarketMock.getActivityRequestCount()).toBe(1);
  });
});
