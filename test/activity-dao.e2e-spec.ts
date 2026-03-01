import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { typeOrmConfig } from '../src/config/database.config';
import { ActivityModule } from '../src/activity/activity.module';
import { ActivityDao } from '../src/activity/activity.dao';
import { PolymarketActivity } from '../src/activity/activity.entity';

function makeActivity(
  overrides: Partial<PolymarketActivity> = {},
): PolymarketActivity {
  return Object.assign(new PolymarketActivity(), {
    transactionHashes: ['0xAAA', '0xBBB'],
    timestamp: new Date('2024-01-15T12:00:00Z'),
    eventTitle: 'Test Event',
    eventLink: 'https://polymarket.com/event/test',
    marketSlug: 'test-market',
    outcomePurchased: 'Yes',
    side: 'BUY',
    totalPriceUsd: 100.0,
    numTokens: 200.0,
    avgPricePerToken: 0.5,
    activityCount: 2,
    orders: [],
    ...overrides,
  });
}

describe('ActivityDao Integration', () => {
  let moduleFixture: TestingModule;
  let dao: ActivityDao;
  let repository: Repository<PolymarketActivity>;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync(typeOrmConfig),
        ActivityModule,
      ],
    }).compile();

    dao = moduleFixture.get<ActivityDao>(ActivityDao);
    repository = moduleFixture.get<Repository<PolymarketActivity>>(
      getRepositoryToken(PolymarketActivity),
    );
  });

  afterAll(async () => {
    await moduleFixture.close();
  });

  beforeEach(async () => {
    await repository.clear();
  });

  describe('add', () => {
    it('should persist an activity with a native text array for transactionHashes', async () => {
      const activity = makeActivity({
        transactionHashes: ['0xDEADBEEF', '0xCAFEBABE'],
      });

      await dao.add(activity);

      const rows = await repository.find();
      expect(rows).toHaveLength(1);
      expect(rows[0].transactionHashes).toEqual(['0xDEADBEEF', '0xCAFEBABE']);
    });

    it('should persist all activity fields correctly', async () => {
      const activity = makeActivity();

      await dao.add(activity);

      const rows = await repository.find();
      const saved = rows[0];
      expect(saved.eventTitle).toBe('Test Event');
      expect(saved.outcomePurchased).toBe('Yes');
      expect(saved.side).toBe('BUY');
      expect(saved.totalPriceUsd).toBe(100.0);
      expect(saved.numTokens).toBe(200.0);
      expect(saved.avgPricePerToken).toBe(0.5);
      expect(saved.activityCount).toBe(2);
    });
  });

  describe('existsByAggregationKey', () => {
    it('should return true when an activity with matching key exists', async () => {
      await dao.add(
        makeActivity({
          timestamp: new Date('2024-01-15T12:00:00Z'),
          marketSlug: 'test-market',
          outcomePurchased: 'Yes',
          side: 'BUY',
        }),
      );

      const result = await dao.existsByAggregationKey(
        new Date('2024-01-15T12:00:00Z'),
        'test-market',
        'Yes',
        'BUY',
      );

      expect(result).toBe(true);
    });

    it('should return false when no activity with matching key exists', async () => {
      const result = await dao.existsByAggregationKey(
        new Date('2024-01-15T12:00:00Z'),
        'nonexistent-market',
        'No',
        'SELL',
      );

      expect(result).toBe(false);
    });

    it('should return false when only some fields match', async () => {
      await dao.add(
        makeActivity({
          timestamp: new Date('2024-01-15T12:00:00Z'),
          marketSlug: 'test-market',
          outcomePurchased: 'Yes',
          side: 'BUY',
        }),
      );

      const result = await dao.existsByAggregationKey(
        new Date('2024-01-15T12:00:00Z'),
        'test-market',
        'No',
        'BUY',
      );

      expect(result).toBe(false);
    });
  });

  describe('deleteOlderThan', () => {
    it('should delete activities with timestamp before the cutoff and keep newer ones', async () => {
      const cutoff = new Date('2024-06-01T00:00:00Z');

      await dao.add(
        makeActivity({ timestamp: new Date('2024-01-01T00:00:00Z') }),
      );
      await dao.add(
        makeActivity({ timestamp: new Date('2024-12-01T00:00:00Z') }),
      );

      await dao.deleteOlderThan(cutoff);

      const remaining = await repository.find();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].timestamp.toISOString()).toBe(
        '2024-12-01T00:00:00.000Z',
      );
    });

    it('should delete all activities when all are older than the cutoff', async () => {
      const cutoff = new Date('2025-01-01T00:00:00Z');

      await dao.add(
        makeActivity({ timestamp: new Date('2024-01-01T00:00:00Z') }),
      );
      await dao.add(
        makeActivity({ timestamp: new Date('2024-06-01T00:00:00Z') }),
      );

      await dao.deleteOlderThan(cutoff);

      const remaining = await repository.find();
      expect(remaining).toHaveLength(0);
    });

    it('should keep all activities when none are older than the cutoff', async () => {
      const cutoff = new Date('2024-01-01T00:00:00Z');

      await dao.add(
        makeActivity({ timestamp: new Date('2024-06-01T00:00:00Z') }),
      );
      await dao.add(
        makeActivity({ timestamp: new Date('2024-12-01T00:00:00Z') }),
      );

      await dao.deleteOlderThan(cutoff);

      const remaining = await repository.find();
      expect(remaining).toHaveLength(2);
    });
  });
});
