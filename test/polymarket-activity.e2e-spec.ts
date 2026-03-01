import { Test, TestingModule } from '@nestjs/testing';
import { ActivityService } from '../src/activity/activity.service';
import { ActivityModule } from '../src/activity/activity.module';
import { Logger } from '@nestjs/common';

const TEST_ADDRESS = '0x2005d16a84ceefa912d4e380cd32e7ff827875ea';

describe('PolymarketActivityService (integration)', () => {
  let module: TestingModule;
  let service: ActivityService;
  let activities: Awaited<ReturnType<ActivityService['fetchActivities']>>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ActivityModule],
    }).compile();

    const app = module.createNestApplication();
    app.useLogger(new Logger());

    service = module.get(ActivityService);

    // Single live API call shared across all assertions — avoids redundant network requests.
    // The address is known-active; a non-empty result is expected.
    activities = await service.fetchActivities(TEST_ADDRESS, 50);
  });

  afterAll(async () => {
    await module.close();
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

      expect(item.date).toBeDefined();
      expect(item.date).not.toBeNull();

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
    expect(activities.length).toBeLessThanOrEqual(50);
  });
});
