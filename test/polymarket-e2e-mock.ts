import nock from 'nock';
import {
  PolymarketProfile,
  RawActivity,
} from '../src/polymarket-api/polymarket-api.types';

const DATA_API_BASE_URL = 'https://data-api.polymarket.com';
const GAMMA_API_BASE_URL = 'https://gamma-api.polymarket.com';
const POLYMARKET_HOSTS = [
  'data-api.polymarket.com',
  'gamma-api.polymarket.com',
];

const EXPECTED_ACTIVITY_QUERY = {
  type: 'TRADE',
  sortBy: 'TIMESTAMP',
  sortDirection: 'DESC',
};

const RECENT_CLUSTER_COUNT = 3;
const STALE_CLUSTER_COUNT = 1;
const ONE_HOUR_SECONDS = 60 * 60;

const ACTIVITY_SCENARIOS = [
  {
    title: 'Will the Fed cut rates by September 2026?',
    eventSlug: 'fed-cut-rates-by-september-2026',
    slug: 'fed-cut-rates-by-september-2026-yes',
    outcome: 'Yes',
    side: 'BUY',
    prices: [0.42, 0.43, 0.44],
    tokenSizes: [750, 500, 1250],
  },
  {
    title: 'Will Bitcoin hit $150k in 2026?',
    eventSlug: 'bitcoin-hit-150k-2026',
    slug: 'bitcoin-hit-150k-2026-no',
    outcome: 'No',
    side: 'SELL',
    prices: [0.31, 0.3, 0.29],
    tokenSizes: [640, 360, 900],
  },
  {
    title: 'Will an AI model win a gold medal on IMO 2026?',
    eventSlug: 'ai-model-gold-medal-imo-2026',
    slug: 'ai-model-gold-medal-imo-2026-yes',
    outcome: 'Yes',
    side: 'BUY',
    prices: [0.18, 0.19],
    tokenSizes: [4200, 3800],
  },
  {
    title: 'Will Ethereum ETF inflows exceed $25B in 2026?',
    eventSlug: 'ethereum-etf-inflows-exceed-25b-2026',
    slug: 'ethereum-etf-inflows-exceed-25b-2026-no',
    outcome: 'No',
    side: 'BUY',
    prices: [0.67, 0.66, 0.65],
    tokenSizes: [220, 180, 600],
  },
  {
    title: 'Will SpaceX launch more than 175 missions in 2026?',
    eventSlug: 'spacex-launch-more-than-175-missions-2026',
    slug: 'spacex-launch-more-than-175-missions-2026-yes',
    outcome: 'Yes',
    side: 'SELL',
    prices: [0.74, 0.73],
    tokenSizes: [140, 860],
  },
  {
    title: 'Will the S&P 500 close above 7,000 in 2026?',
    eventSlug: 'sp500-close-above-7000-2026',
    slug: 'sp500-close-above-7000-2026-yes',
    outcome: 'Yes',
    side: 'BUY',
    prices: [0.51, 0.52, 0.53, 0.54],
    tokenSizes: [100, 250, 400, 1000],
  },
  {
    title: 'Will global EV sales exceed 25 million in 2026?',
    eventSlug: 'global-ev-sales-exceed-25m-2026',
    slug: 'global-ev-sales-exceed-25m-2026-no',
    outcome: 'No',
    side: 'SELL',
    prices: [0.27, 0.28],
    tokenSizes: [1250, 1750],
  },
  {
    title: 'Will Apple announce a foldable iPhone in 2026?',
    eventSlug: 'apple-announce-foldable-iphone-2026',
    slug: 'apple-announce-foldable-iphone-2026-yes',
    outcome: 'Yes',
    side: 'BUY',
    prices: [0.36, 0.37, 0.38],
    tokenSizes: [325, 475, 900],
  },
  {
    title: 'Will a major exchange list a spot SOL ETF in 2026?',
    eventSlug: 'major-exchange-list-spot-sol-etf-2026',
    slug: 'major-exchange-list-spot-sol-etf-2026-yes',
    outcome: 'Yes',
    side: 'SELL',
    prices: [0.58, 0.59],
    tokenSizes: [800, 1200],
  },
  {
    title: 'Will OpenAI release GPT-6 before July 2026?',
    eventSlug: 'openai-release-gpt-6-before-july-2026',
    slug: 'openai-release-gpt-6-before-july-2026-no',
    outcome: 'No',
    side: 'BUY',
    prices: [0.8, 0.81, 0.82],
    tokenSizes: [75, 125, 250],
  },
  {
    title: 'Will the Lakers win the 2026 NBA Finals?',
    eventSlug: 'lakers-win-2026-nba-finals',
    slug: 'lakers-win-2026-nba-finals-no',
    outcome: 'No',
    side: 'SELL',
    prices: [0.12, 0.13],
    tokenSizes: [5000, 2500],
  },
  {
    title: 'Will US unemployment be above 5% in December 2026?',
    eventSlug: 'us-unemployment-above-5-december-2026',
    slug: 'us-unemployment-above-5-december-2026-yes',
    outcome: 'Yes',
    side: 'BUY',
    prices: [0.24, 0.25, 0.26],
    tokenSizes: [950, 1050, 2100],
  },
];

const MOCK_PROFILE: PolymarketProfile = {
  name: 'RN1',
  pseudonym: 'rn1',
  bio: 'High-volume Polymarket trader used by e2e fixtures.',
  profileImage: 'https://polymarket.com/profile-fixtures/rn1.png',
  xUsername: 'rn1_markets',
  verifiedBadge: true,
  displayUsernamePublic: true,
  proxyWallet: '0x2005d16a84ceefa912d4e380cd32e7ff827875ea',
  createdAt: '2024-01-15T10:00:00.000Z',
};

export type PolymarketMock = {
  getActivityRequestCount: () => number;
  getProfileRequestCount: () => number;
  getRawActivities: () => RawActivity[];
  getRecentRawActivities: () => RawActivity[];
  getAggregatedActivityCount: () => number;
  getRecentAggregatedActivityCount: () => number;
};

export function configureMockPolymarketEnv(): void {
  if (!shouldMockPolymarket()) return;

  process.env.NO_PROXY = withPolymarketNoProxy(process.env.NO_PROXY);
  process.env.no_proxy = withPolymarketNoProxy(process.env.no_proxy);
}

export function shouldMockPolymarket(): boolean {
  return process.env.POLYMARKET_E2E_MOCK === 'true';
}

export function mockPolymarketApis(): PolymarketMock | undefined {
  if (!shouldMockPolymarket()) return undefined;

  const rawActivities = buildRawActivities();
  let activityRequestCount = 0;
  let profileRequestCount = 0;

  nock(DATA_API_BASE_URL)
    .persist()
    .get('/activity')
    .query((query) => isExpectedActivityQuery(query))
    .reply(200, (uri) => {
      activityRequestCount += 1;
      return rawActivities.slice(0, getRequestedLimit(uri));
    });

  nock(GAMMA_API_BASE_URL)
    .persist()
    .get('/public-profile')
    .query((query) => typeof query.address === 'string')
    .reply(200, () => {
      profileRequestCount += 1;
      return MOCK_PROFILE;
    });

  return {
    getActivityRequestCount: () => activityRequestCount,
    getProfileRequestCount: () => profileRequestCount,
    getRawActivities: () => rawActivities,
    getRecentRawActivities: () => getRecentRawActivities(rawActivities),
    getAggregatedActivityCount: () => countAggregatedActivities(rawActivities),
    getRecentAggregatedActivityCount: () =>
      countAggregatedActivities(getRecentRawActivities(rawActivities)),
  };
}

export function cleanPolymarketMock(): void {
  if (!shouldMockPolymarket()) return;

  nock.cleanAll();
}

function buildRawActivities(): RawActivity[] {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const records: RawActivity[] = [];

  Array.from({ length: RECENT_CLUSTER_COUNT + STALE_CLUSTER_COUNT }).forEach(
    (_, clusterIndex) => {
      const staleCluster = clusterIndex >= RECENT_CLUSTER_COUNT;
      const clusterOffsetSeconds = staleCluster
        ? ONE_HOUR_SECONDS + 600
        : clusterIndex * 900;

      ACTIVITY_SCENARIOS.forEach((scenario, scenarioIndex) => {
        const timestamp =
          nowSeconds - clusterOffsetSeconds - scenarioIndex * 45;
        const priceShift = clusterIndex * 0.01;
        const sizeMultiplier = 1 + clusterIndex * 0.35;
        const scenarioKey =
          clusterIndex * ACTIVITY_SCENARIOS.length + scenarioIndex;

        scenario.prices.forEach((basePrice, orderIndex) => {
          const price = Number(
            Math.min(0.99, basePrice + priceShift).toFixed(2),
          );
          const size = Number(
            (scenario.tokenSizes[orderIndex] * sizeMultiplier).toFixed(2),
          );
          records.push({
            transactionHash: makeTransactionHash(scenarioKey, orderIndex),
            timestamp,
            title: scenario.title,
            eventSlug: scenario.eventSlug,
            slug: scenario.slug,
            outcome: scenario.outcome,
            side: scenario.side,
            usdcSize: Number((size * price).toFixed(2)),
            size,
            price,
          });
        });
      });
    },
  );

  return records.sort((a, b) => b.timestamp - a.timestamp);
}

function isExpectedActivityQuery(query: Record<string, unknown>): boolean {
  return (
    typeof query.user === 'string' &&
    typeof query.limit === 'string' &&
    query.type === EXPECTED_ACTIVITY_QUERY.type &&
    query.sortBy === EXPECTED_ACTIVITY_QUERY.sortBy &&
    query.sortDirection === EXPECTED_ACTIVITY_QUERY.sortDirection
  );
}

function getRequestedLimit(uri: string): number {
  const url = new URL(uri, DATA_API_BASE_URL);
  const limit = Number(url.searchParams.get('limit'));

  return Number.isFinite(limit) && limit > 0 ? limit : 50;
}

function getRecentRawActivities(rawActivities: RawActivity[]): RawActivity[] {
  const oneHourAgo = Math.floor(Date.now() / 1000) - ONE_HOUR_SECONDS;

  return rawActivities.filter((activity) => activity.timestamp >= oneHourAgo);
}

function countAggregatedActivities(rawActivities: RawActivity[]): number {
  return new Set(
    rawActivities.map((activity) =>
      JSON.stringify([
        activity.timestamp,
        activity.slug,
        activity.outcome,
        activity.side,
      ]),
    ),
  ).size;
}

function withPolymarketNoProxy(value: string | undefined): string {
  const entries = (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  for (const host of POLYMARKET_HOSTS) {
    if (!entries.includes(host)) entries.push(host);
  }

  return entries.join(',');
}

function makeTransactionHash(
  scenarioIndex: number,
  orderIndex: number,
): string {
  return `0x${scenarioIndex.toString(16).padStart(2, '0')}${orderIndex
    .toString(16)
    .padStart(2, '0')}${'a'.repeat(60)}`;
}
