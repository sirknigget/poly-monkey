import { TestBed, Mocked } from '@suites/unit';
import { ActivityService } from './activity.service';
import { PolymarketApiService } from '../polymarket-api/polymarket-api.service';

describe('ActivityService', () => {
  let service: ActivityService;
  let mockApi: Mocked<PolymarketApiService>;

  beforeAll(async () => {
    const { unit, unitRef } = await TestBed.solitary(ActivityService).compile();
    service = unit;
    mockApi = unitRef.get(PolymarketApiService);
  });

  // FR-5/FR-6: single-record group → all output fields populated correctly
  describe('single-record group output shape', () => {
    beforeEach(() => {
      mockApi.getActivities.mockResolvedValue([
        {
          transactionHash: '0xAAA',
          timestamp: 1700000000,
          title: 'Test Market',
          eventSlug: 'test-market',
          slug: 'test-slug',
          outcome: 'Yes',
          side: 'BUY',
          usdcSize: 10.5,
          size: 21.0,
          price: 0.5,
        },
      ]);
    });

    it('returns one record with all fields at exact literal values', async () => {
      const result = await service.fetchActivities('0xtest', 1, 0);

      expect(result.length).toBe(1);
      expect(result[0].transactionHashes).toEqual(['0xAAA']);
      expect(result[0].activityCount).toBe(1);
      expect(result[0].totalPriceUsd).toBe(10.5);
      expect(result[0].numTokens).toBe(21.0);
      expect(result[0].avgPricePerToken).toBe(0.5);
      expect(result[0].outcomePurchased).toBe('Yes');
      expect(result[0].side).toBe('BUY');
      expect(result[0].marketSlug).toBe('test-slug');
      expect(result[0].eventTitle).toBe('Test Market');
      expect(result[0].eventLink).toBe(
        'https://polymarket.com/event/test-market',
      );
      expect(result[0].timestamp).toEqual(new Date(1700000000 * 1000));
      expect(result[0].orders).toHaveLength(1);
      expect(result[0].orders[0].tokenPrice).toBe(0.5);
      expect(result[0].orders[0].numTokens).toBe(21.0);
      expect(result[0].orders[0].priceUsdt).toBe(10.5);
    });
  });

  // FR-5/FR-6: multi-record group with different outcomes → separate activities (outcome is part of composite key)
  describe('multi-record group with different outcomes produces separate activities', () => {
    beforeEach(() => {
      mockApi.getActivities.mockResolvedValue([
        {
          transactionHash: '0xBBB',
          timestamp: 1700000001,
          slug: 'multi-market',
          outcome: 'Yes',
          side: 'BUY',
          usdcSize: 10,
          size: 20,
          price: 0.5,
          title: 'Multi',
          eventSlug: 'multi',
        },
        {
          transactionHash: '0xBBB',
          timestamp: 1700000001,
          slug: 'multi-market',
          outcome: 'No',
          side: 'BUY',
          usdcSize: 5,
          size: 10,
          price: 0.6,
          title: 'Multi',
          eventSlug: 'multi',
        },
      ]);
    });

    it('returns two separate activities because outcome differs between records', async () => {
      const result = await service.fetchActivities('0xtest', 50, 0);

      expect(result.length).toBe(2);
    });
  });

  // FR-7: cross-transaction merge → same (timestamp, slug, outcome, side) but different hash → one merged record
  describe('cross-transaction merge on matching composite key', () => {
    beforeEach(() => {
      mockApi.getActivities.mockResolvedValue([
        {
          transactionHash: '0xAAA',
          timestamp: 1700000000,
          slug: 'market-a',
          outcome: 'Yes',
          side: 'BUY',
          usdcSize: 10,
          size: 20,
          price: 0.5,
          title: 'Market A',
          eventSlug: 'market-a-event',
        },
        {
          transactionHash: '0xBBB',
          timestamp: 1700000000,
          slug: 'market-a',
          outcome: 'Yes',
          side: 'BUY',
          usdcSize: 5,
          size: 10,
          price: 0.5,
          title: 'Market A',
          eventSlug: 'market-a-event',
        },
      ]);
    });

    it('merges two records sharing the composite key into one with correct sums and both transactionHashes', async () => {
      const result = await service.fetchActivities('0xtest', 50, 0);

      expect(result.length).toBe(1);
      expect(result[0].totalPriceUsd).toBe(15.0);
      expect(result[0].numTokens).toBe(30.0);
      expect(result[0].avgPricePerToken).toBe(0.5);
      expect(result[0].activityCount).toBe(2);
      expect(result[0].transactionHashes).toContain('0xAAA');
      expect(result[0].transactionHashes).toContain('0xBBB');
      expect(result[0].orders).toHaveLength(2);
      expect(result[0].orders[0]).toEqual({
        tokenPrice: 0.5,
        numTokens: 20,
        priceUsdt: 10,
      });
      expect(result[0].orders[1]).toEqual({
        tokenPrice: 0.5,
        numTokens: 10,
        priceUsdt: 5,
      });
    });
  });

  // FR-7: no merge when any composite key field differs → two separate records
  describe('no merge when any composite key field differs', () => {
    beforeEach(() => {
      mockApi.getActivities.mockResolvedValue([
        {
          transactionHash: '0xAAA',
          timestamp: 1700000000,
          slug: 'market-a',
          outcome: 'Yes',
          side: 'BUY',
          usdcSize: 10,
          size: 20,
          price: 0.5,
          title: 'Market A',
          eventSlug: 'market-a-event',
        },
        {
          transactionHash: '0xBBB',
          timestamp: 1700000000,
          slug: 'market-b',
          outcome: 'Yes',
          side: 'BUY',
          usdcSize: 5,
          size: 10,
          price: 0.5,
          title: 'Market B',
          eventSlug: 'market-b-event',
        },
      ]);
    });

    it('returns two separate records when slug differs between records with otherwise matching keys', async () => {
      const result = await service.fetchActivities('0xtest', 50, 0);

      expect(result.length).toBe(2);
    });
  });

  // fromTime filter: exclude activities older than cutoff
  describe('fromTime filter excludes activities older than the cutoff', () => {
    beforeEach(() => {
      mockApi.getActivities.mockResolvedValue([
        {
          transactionHash: '0xOLD',
          timestamp: 1699999999, // seconds; 1699999999 * 1000 < 1700000000000
          slug: 'market-old',
          outcome: 'Yes',
          side: 'BUY',
          usdcSize: 5,
          size: 10,
          price: 0.5,
          title: 'Old Market',
          eventSlug: 'old-event',
        },
        {
          transactionHash: '0xNEW',
          timestamp: 1700000001, // seconds; 1700000001 * 1000 > 1700000000000
          slug: 'market-new',
          outcome: 'Yes',
          side: 'BUY',
          usdcSize: 10,
          size: 20,
          price: 0.5,
          title: 'New Market',
          eventSlug: 'new-event',
        },
      ]);
    });

    it('excludes the older record and returns only the newer one', async () => {
      const result = await service.fetchActivities('0xtest', 50, 1700000000000);

      expect(result.length).toBe(1);
      expect(result[0].marketSlug).toBe('market-new');
    });
  });

  // fromTime filter: boundary — activity at exact threshold is included
  describe('fromTime filter includes activity at exact threshold', () => {
    beforeEach(() => {
      mockApi.getActivities.mockResolvedValue([
        {
          transactionHash: '0xBOUND',
          timestamp: 1700000000, // seconds; 1700000000 * 1000 === 1700000000000
          slug: 'market-boundary',
          outcome: 'Yes',
          side: 'BUY',
          usdcSize: 10,
          size: 20,
          price: 0.5,
          title: 'Boundary Market',
          eventSlug: 'boundary-event',
        },
      ]);
    });

    it('includes an activity whose timestamp exactly equals fromTime / 1000', async () => {
      const result = await service.fetchActivities('0xtest', 50, 1700000000000);

      expect(result.length).toBe(1);
      expect(result[0].marketSlug).toBe('market-boundary');
    });
  });

  // FR-8: output sorted descending by timestamp
  describe('descending timestamp sort order', () => {
    beforeEach(() => {
      mockApi.getActivities.mockResolvedValue([
        {
          transactionHash: '0xT1',
          timestamp: 1000,
          slug: 'slug-1000',
          outcome: 'Yes',
          side: 'BUY',
          usdcSize: 1,
          size: 2,
          price: 0.5,
          title: 'T1',
          eventSlug: 'event-1000',
        },
        {
          transactionHash: '0xT3',
          timestamp: 3000,
          slug: 'slug-3000',
          outcome: 'Yes',
          side: 'BUY',
          usdcSize: 1,
          size: 2,
          price: 0.5,
          title: 'T3',
          eventSlug: 'event-3000',
        },
        {
          transactionHash: '0xT2',
          timestamp: 2000,
          slug: 'slug-2000',
          outcome: 'Yes',
          side: 'BUY',
          usdcSize: 1,
          size: 2,
          price: 0.5,
          title: 'T2',
          eventSlug: 'event-2000',
        },
      ]);
    });

    it('outputs three records ordered most-recent first: timestamps 3000, 2000, 1000', async () => {
      const result = await service.fetchActivities('0xtest', 50, 0);

      expect(result.length).toBe(3);
      expect(result[0].timestamp).toEqual(new Date(3000 * 1000));
      expect(result[1].timestamp).toEqual(new Date(2000 * 1000));
      expect(result[2].timestamp).toEqual(new Date(1000 * 1000));
    });
  });
});
