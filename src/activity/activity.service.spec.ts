// ActivityService Unit Tests - Design Doc: 20260226-activity-module-production.md
// Generated: 2026-02-26 | Budget Used: 6/6 unit scenarios per FR-11

import { Test, TestingModule } from '@nestjs/testing';
import { ActivityService } from './activity.service';
import { ActivityModule } from './activity.module';
import { PolymarketApiService } from '../polymarket-api/polymarket-api.service';

// ---------------------------------------------------------------------------
// Shared mock factory — returns a fresh jest.fn() for each test module so
// tests cannot accidentally share state through the mock reference.
// ---------------------------------------------------------------------------

function buildApiMock(rawActivities: object[]) {
  return {
    getActivities: jest.fn().mockResolvedValue(rawActivities),
  };
}

// ---------------------------------------------------------------------------
// FR-11 Scenario 1 — Single-record group output shape
//
// AC: "A unit test covering single-record group output shape shall assert all
//      PolymarketActivity fields with exact literal values."
// Behavior: mock returns one RawActivity → formatGroup (single-record path) →
//           one PolymarketActivity with all 11 fields at exact values
// @category: core-functionality
// @dependency: ActivityService, ActivityModule, PolymarketApiService (mock)
// @complexity: medium
// ROI: 95 | Business Value: 10 (full output contract) | Frequency: 10 (every call)
// ---------------------------------------------------------------------------
describe('ActivityService – Scenario 1: single-record group output shape', () => {
  let service: ActivityService;

  const RAW = [
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
  ];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ActivityModule],
    })
      .overrideProvider(PolymarketApiService)
      .useValue(buildApiMock(RAW))
      .compile();

    service = module.get(ActivityService);
  });

  // AC: FR-5/FR-6 — "When fetchActivities is called and the raw response contains a
  //     single record with transactionHash = '0xAAA', the system shall return one activity
  //     with transactionHash = '0xAAA', activityCount = 1, avgPricePerToken equal to the
  //     record's price rounded to 4dp, totalPriceUsd equal to usdcSize rounded to 2dp,
  //     and numTokens equal to size rounded to 2dp."
  // Behavior: one RawActivity record → formatGroup (single path) → one PolymarketActivity
  //           with all 11 fields populated from the fixture's literal values
  // Verification items:
  // - result.length === 1
  // - transactionHash === '0xAAA'
  // - activityCount === 1
  // - totalPriceUsd === 10.5
  // - numTokens === 21.0
  // - avgPricePerToken === 0.5
  // - outcomePurchased === 'Yes'
  // - side === 'BUY'
  // - marketSlug === 'test-slug'
  // - eventTitle === 'Test Market'
  // - eventLink === 'https://polymarket.com/event/test-market'
  // - date === new Date(1700000000 * 1000).toLocaleString()
  it('returns one record with all 11 fields at exact literal values', async () => {
    // Arrange: done in beforeAll

    // Act
    const result = await service.fetchActivities('0xtest', 1);

    // Assert
    expect(result.length).toBe(1);
    expect(result[0].transactionHash).toBe('0xAAA');
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
    expect(result[0].date).toBe(new Date(1700000000 * 1000).toLocaleString());
  });
});

// ---------------------------------------------------------------------------
// FR-11 Scenario 2 — Multi-record group aggregation math
//
// AC: "A unit test covering multi-record group aggregation math shall assert summed
//      totalPriceUsd, summed numTokens, and computed avgPricePerToken with exact values."
// Behavior: two RawActivity records sharing transactionHash '0xBBB' →
//           formatGroup (multi-record path) → one PolymarketActivity with correct sums
//           and alphabetically sorted unique outcomePurchased
// @category: core-functionality
// @dependency: ActivityService, ActivityModule, PolymarketApiService (mock)
// @complexity: medium
// ROI: 90 | Business Value: 9 (aggregation contract) | Frequency: 8 (multi-token trades)
// ---------------------------------------------------------------------------
describe('ActivityService – Scenario 2: multi-record group aggregation math', () => {
  let service: ActivityService;

  const RAW = [
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
  ];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ActivityModule],
    })
      .overrideProvider(PolymarketApiService)
      .useValue(buildApiMock(RAW))
      .compile();

    service = module.get(ActivityService);
  });

  // AC: FR-5/FR-6 multi-record — "totalPriceUsd equals the sum of all usdcSize values
  //     rounded to 2dp, numTokens equals the sum of all size values rounded to 2dp, and
  //     avgPricePerToken equals totalPriceUsd / numTokens rounded to 4dp.
  //     When multiple records have distinct outcome values, outcomePurchased is the unique
  //     values sorted alphabetically and joined with ', '."
  // Behavior: [usdcSize:10 + usdcSize:5] → totalPriceUsd=15; [size:20 + size:10] → numTokens=30;
  //           15/30 → avgPricePerToken=0.5; outcomes ['Yes','No'] sorted → 'No, Yes'
  // Verification items:
  // - result.length === 1
  // - totalPriceUsd === 15.0
  // - numTokens === 30.0
  // - avgPricePerToken === 0.5
  // - outcomePurchased === 'No, Yes'
  // - activityCount === 2
  it('sums usdcSize→totalPriceUsd, sums size→numTokens, recomputes avgPricePerToken, sorts unique outcomes', async () => {
    // Arrange: done in beforeAll

    // Act
    const result = await service.fetchActivities('0xtest', 50);

    // Assert
    expect(result.length).toBe(1);
    expect(result[0].totalPriceUsd).toBe(15.0);
    expect(result[0].numTokens).toBe(30.0);
    expect(result[0].avgPricePerToken).toBe(0.5);
    expect(result[0].outcomePurchased).toBe('No, Yes');
    expect(result[0].activityCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// FR-11 Scenario 3 — Cross-transaction merge when all four key fields match
//
// AC: "A unit test covering cross-transaction merge shall assert that two fixtures
//      sharing all four composite-key fields produce exactly one merged output record
//      with correct sums and recomputed average."
// Behavior: two RawActivity records with different transactionHash but identical
//           (timestamp, slug, outcome, side) → pass 2 merges them → one output record
// @category: core-functionality
// @dependency: ActivityService, ActivityModule, PolymarketApiService (mock)
// @complexity: high
// ROI: 92 | Business Value: 10 (deduplication contract) | Frequency: 7 (cross-tx trades)
// ---------------------------------------------------------------------------
describe('ActivityService – Scenario 3: cross-transaction merge on matching composite key', () => {
  let service: ActivityService;

  const RAW = [
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
  ];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ActivityModule],
    })
      .overrideProvider(PolymarketApiService)
      .useValue(buildApiMock(RAW))
      .compile();

    service = module.get(ActivityService);
  });

  // AC: FR-7 — "When two intermediate records share the same numeric timestamp,
  //     marketSlug, outcomePurchased, and side but have different transactionHash values,
  //     the system shall return exactly one merged record. totalPriceUsd shall equal the
  //     sum, numTokens shall equal the sum, avgPricePerToken shall equal
  //     mergedTotalPriceUsd / mergedNumTokens rounded to 4dp, activityCount shall equal
  //     the sum, and transactionHash shall equal the first record's hash."
  // Behavior: two distinct-hash records with same (timestamp,slug,outcome,side) →
  //           pass 2 merges → result.length=1, totalPriceUsd=15, numTokens=30,
  //           avgPricePerToken=0.5, activityCount=2, transactionHash='0xAAA'
  // Verification items:
  // - result.length === 1
  // - totalPriceUsd === 15.0
  // - numTokens === 30.0
  // - avgPricePerToken === 0.5
  // - activityCount === 2
  // - transactionHash === '0xAAA' (first record's hash preserved)
  it('merges two records sharing the composite key into one with correct sums and first record transactionHash', async () => {
    // Arrange: done in beforeAll

    // Act
    const result = await service.fetchActivities('0xtest', 50);

    // Assert
    expect(result.length).toBe(1);
    expect(result[0].totalPriceUsd).toBe(15.0);
    expect(result[0].numTokens).toBe(30.0);
    expect(result[0].avgPricePerToken).toBe(0.5);
    expect(result[0].activityCount).toBe(2);
    expect(result[0].transactionHash).toBe('0xAAA');
  });
});

// ---------------------------------------------------------------------------
// FR-11 Scenario 4 — No merge when any key field differs
//
// AC: "A unit test covering no-merge on field mismatch shall assert that two fixtures
//      differing in any key field produce two separate output records."
// Behavior: same (timestamp, outcome, side) but different slug → pass 2 does NOT merge
//           → two separate output records
// @category: core-functionality
// @dependency: ActivityService, ActivityModule, PolymarketApiService (mock)
// @complexity: medium
// ROI: 80 | Business Value: 9 (deduplication boundary) | Frequency: 7 (cross-tx trades)
// ---------------------------------------------------------------------------
describe('ActivityService – Scenario 4: no merge when any composite key field differs', () => {
  let service: ActivityService;

  const RAW = [
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
  ];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ActivityModule],
    })
      .overrideProvider(PolymarketApiService)
      .useValue(buildApiMock(RAW))
      .compile();

    service = module.get(ActivityService);
  });

  // AC: FR-7 — "When two intermediate records differ in any one of timestamp, marketSlug,
  //     outcomePurchased, or side, the system shall not merge them and shall return both
  //     as separate records."
  // Behavior: same (timestamp, outcome, side) but slug differs ('market-a' vs 'market-b')
  //           → composite keys are distinct → two records in output
  // Verification items:
  // - result.length === 2
  it('returns two separate records when slug differs between records with otherwise matching keys', async () => {
    // Arrange: done in beforeAll

    // Act
    const result = await service.fetchActivities('0xtest', 50);

    // Assert
    expect(result.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// FR-11 Scenario 5 — Sort order (descending timestamp)
//
// AC: "A unit test covering sort order shall assert descending timestamp order across
//      at least three fixtures with distinct timestamps."
// Behavior: three records with timestamps 1000, 3000, 2000 (different hashes and slugs
//           to prevent pass-2 merging) → output sorted [3000, 2000, 1000]
// @category: core-functionality
// @dependency: ActivityService, ActivityModule, PolymarketApiService (mock)
// @complexity: medium
// ROI: 85 | Business Value: 8 (sort contract for consumers) | Frequency: 10 (every call)
// ---------------------------------------------------------------------------
describe('ActivityService – Scenario 5: descending timestamp sort order', () => {
  let service: ActivityService;

  // Distinct slugs and hashes ensure no pass-2 merge occurs — sort is the only
  // operation that determines output order.
  const RAW = [
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
  ];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ActivityModule],
    })
      .overrideProvider(PolymarketApiService)
      .useValue(buildApiMock(RAW))
      .compile();

    service = module.get(ActivityService);
  });

  // AC: FR-8 — "The output of fetchActivities shall be sorted by numeric timestamp
  //     descending — for any adjacent pair [i] and [i+1], the timestamp of item [i]
  //     shall be greater than or equal to the timestamp of item [i+1]."
  // Behavior: input order [1000, 3000, 2000] → sorted output [3000, 2000, 1000]
  //           verified by asserting date strings equal new Date(ts * 1000).toLocaleString()
  //           for each expected position. toLocaleString() is deterministic within a
  //           single JS engine and locale, so expected values are computed the same way.
  // Verification items:
  // - result.length === 3
  // - result[0].date === new Date(3000 * 1000).toLocaleString()
  // - result[1].date === new Date(2000 * 1000).toLocaleString()
  // - result[2].date === new Date(1000 * 1000).toLocaleString()
  it('outputs three records ordered most-recent first: timestamps 3000, 2000, 1000', async () => {
    // Arrange: done in beforeAll

    // Act
    const result = await service.fetchActivities('0xtest', 50);

    // Assert
    expect(result.length).toBe(3);
    expect(result[0].date).toBe(new Date(3000 * 1000).toLocaleString());
    expect(result[1].date).toBe(new Date(2000 * 1000).toLocaleString());
    expect(result[2].date).toBe(new Date(1000 * 1000).toLocaleString());
  });
});

// ---------------------------------------------------------------------------
// FR-11 Scenario 6 — Missing timestamp treated as 0 for sort (appears last)
//
// AC: "A unit test covering missing timestamp shall assert that a fixture without
//      timestamp appears last in the output array."
// Behavior: one record with timestamp:1000000, one without timestamp →
//           sort treats missing as 0 → timestamped record first, no-timestamp record last
//           with date === 'N/A'
// @category: core-functionality
// @dependency: ActivityService, ActivityModule, PolymarketApiService (mock)
// @complexity: low
// ROI: 72 | Business Value: 7 (sort edge case) | Frequency: 3 (occasional missing data)
// ---------------------------------------------------------------------------
describe('ActivityService – Scenario 6: missing timestamp treated as 0 for sort', () => {
  let service: ActivityService;

  // Distinct slugs prevent pass-2 merge; the second record intentionally omits timestamp.
  const RAW = [
    {
      transactionHash: '0xHAS_TS',
      timestamp: 1000000,
      slug: 'slug-has-ts',
      outcome: 'Yes',
      side: 'BUY',
      usdcSize: 1,
      size: 2,
      price: 0.5,
      title: 'Has Timestamp',
      eventSlug: 'event-has-ts',
    },
    {
      transactionHash: '0xNO_TS',
      slug: 'slug-no-ts',
      outcome: 'Yes',
      side: 'BUY',
      usdcSize: 1,
      size: 2,
      price: 0.5,
      title: 'No Timestamp',
      eventSlug: 'event-no-ts',
    },
  ];

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ActivityModule],
    })
      .overrideProvider(PolymarketApiService)
      .useValue(buildApiMock(RAW))
      .compile();

    service = module.get(ActivityService);
  });

  // AC: FR-8 — "When a record has no timestamp in the raw API response, the system shall
  //     treat it as timestamp 0 for sort purposes, placing it last in the output."
  // AC: FR-5/FR-6 — "When a single-record group has no timestamp, then date shall be 'N/A'."
  // Behavior: record without timestamp sorts to position [1] (last) and produces date='N/A';
  //           record with timestamp=1000000 sorts to position [0] and produces a non-'N/A' date
  // Verification items:
  // - result.length === 2
  // - result[0].date !== 'N/A' (the record that has a timestamp)
  // - result[1].date === 'N/A' (the record without a timestamp appears last)
  it('places the record with a timestamp before the record missing a timestamp, and missing-timestamp date is N/A', async () => {
    // Arrange: done in beforeAll

    // Act
    const result = await service.fetchActivities('0xtest', 50);

    // Assert
    expect(result.length).toBe(2);
    expect(result[0].date).not.toBe('N/A');
    expect(result[1].date).toBe('N/A');
  });
});
