import { TestBed } from '@suites/unit';
import { NotificationFormattingService } from './notification-formatting.service';
import { PolymarketActivity } from '../activity/activity.entity';

const FULL_ACTIVITY: PolymarketActivity = {
  transactionHashes: ['0xAAA'],
  userAddress: '0xabc123',
  timestamp: new Date('2024-01-01T00:00:00.000Z'),
  eventTitle: 'Will Bitcoin hit $100k?',
  eventLink: 'https://polymarket.com/event/bitcoin-100k',
  marketSlug: 'bitcoin-100k-jan',
  outcomePurchased: 'Yes',
  side: 'BUY',
  totalPriceUsd: 10.5,
  numTokens: 21.0,
  avgPricePerToken: 0.5,
  activityCount: 1,
  orders: [{ tokenPrice: 0.5, numTokens: 21.0, priceUsdt: 10.5 }],
};

async function buildService(): Promise<NotificationFormattingService> {
  const { unit } = await TestBed.solitary(
    NotificationFormattingService,
  ).compile();
  return unit;
}

// ---------------------------------------------------------------------------
// Scenario 1 — Full activity: all fields present
// ---------------------------------------------------------------------------
describe('NotificationFormattingService – Scenario 1: full activity formatting', () => {
  let service: NotificationFormattingService;

  beforeAll(async () => {
    service = await buildService();
  });

  it('includes the event title wrapped in bold', () => {
    const msg = service.format(FULL_ACTIVITY);
    expect(msg).toContain('<b>Will Bitcoin hit $100k?</b>');
  });

  it('includes a clickable Polymarket link with the correct href', () => {
    const msg = service.format(FULL_ACTIVITY);
    expect(msg).toContain(
      '<a href="https://polymarket.com/event/bitcoin-100k">View on Polymarket</a>',
    );
  });

  it('includes the formatted USD total with two decimal places', () => {
    const msg = service.format(FULL_ACTIVITY);
    expect(msg).toContain('$10.50');
  });

  it('includes the token count with two decimal places', () => {
    const msg = service.format(FULL_ACTIVITY);
    expect(msg).toContain('21.00');
  });

  it('includes the avg price per token with four decimal places', () => {
    const msg = service.format(FULL_ACTIVITY);
    expect(msg).toContain('$0.5000');
  });

  it('includes the outcome', () => {
    const msg = service.format(FULL_ACTIVITY);
    expect(msg).toContain('Yes');
  });

  it('includes the side', () => {
    const msg = service.format(FULL_ACTIVITY);
    expect(msg).toContain('BUY');
  });

  it('includes the date', () => {
    const msg = service.format(FULL_ACTIVITY);
    expect(msg).toContain(FULL_ACTIVITY.timestamp.toLocaleString());
  });

  it('includes the activityCount', () => {
    const msg = service.format(FULL_ACTIVITY);
    expect(msg).toContain('1');
  });

  it('does not include a breakdown line when all orders share the same price', () => {
    const msg = service.format(FULL_ACTIVITY);
    expect(msg).not.toContain('↳');
  });

  it('includes a clickable user profile link with the address as fallback text', () => {
    const msg = service.format(FULL_ACTIVITY);
    expect(msg).toContain(
      '<a href="https://polymarket.com/0xabc123">User 0xabc123</a>',
    );
  });

  it('does not include @name when no profile is provided', () => {
    const msg = service.format(FULL_ACTIVITY);
    expect(msg).not.toContain(' @');
  });
});

// ---------------------------------------------------------------------------
// Scenario 2 — Missing eventLink (N/A)
// ---------------------------------------------------------------------------
describe('NotificationFormattingService – Scenario 2: missing eventLink', () => {
  let service: NotificationFormattingService;

  beforeAll(async () => {
    service = await buildService();
  });

  it('renders N/A instead of an anchor tag when eventLink is "N/A"', () => {
    const activity: PolymarketActivity = { ...FULL_ACTIVITY, eventLink: 'N/A' };
    const msg = service.format(activity);
    expect(msg).toContain('🔗 N/A');
    expect(msg).not.toContain('View on Polymarket');
  });
});

// ---------------------------------------------------------------------------
// Scenario 3 — Multi-trade group (activityCount > 1)
// ---------------------------------------------------------------------------
describe('NotificationFormattingService – Scenario 3: multi-trade group', () => {
  let service: NotificationFormattingService;

  beforeAll(async () => {
    service = await buildService();
  });

  it('shows the correct trade count in the "Trades in group" line', () => {
    const activity: PolymarketActivity = {
      ...FULL_ACTIVITY,
      activityCount: 5,
      totalPriceUsd: 55.0,
      numTokens: 110.0,
      outcomePurchased: 'No, Yes',
    };
    const msg = service.format(activity);
    expect(msg).toContain('5');
    expect(msg).toContain('No, Yes');
  });
});

// ---------------------------------------------------------------------------
// Scenario 4 — Multi-price group: breakdown line rendered
// ---------------------------------------------------------------------------
describe('NotificationFormattingService – Scenario 4: multi-price breakdown', () => {
  let service: NotificationFormattingService;

  beforeAll(async () => {
    service = await buildService();
  });

  it('includes a ↳ breakdown line when orders have distinct prices', () => {
    const activity: PolymarketActivity = {
      ...FULL_ACTIVITY,
      totalPriceUsd: 441.32,
      numTokens: 441.0,
      avgPricePerToken: 0.7395,
      activityCount: 3,
      orders: [
        { tokenPrice: 0.73, numTokens: 8.0, priceUsdt: 5.84 },
        { tokenPrice: 0.7382, numTokens: 40.0, priceUsdt: 29.53 },
        { tokenPrice: 0.74, numTokens: 393.0, priceUsdt: 290.82 },
      ],
    };
    const msg = service.format(activity);
    expect(msg).toContain('↳');
    expect(msg).toContain('$0.7300 × 8.00t');
    expect(msg).toContain('$0.7382 × 40.00t');
    expect(msg).toContain('$0.7400 × 393.00t');
  });

  it('does not include a ↳ breakdown line when all orders share the same price', () => {
    const activity: PolymarketActivity = {
      ...FULL_ACTIVITY,
      activityCount: 2,
      orders: [
        { tokenPrice: 0.5, numTokens: 10.0, priceUsdt: 5.0 },
        { tokenPrice: 0.5, numTokens: 11.0, priceUsdt: 5.5 },
      ],
    };
    const msg = service.format(activity);
    expect(msg).not.toContain('↳');
  });
});

// ---------------------------------------------------------------------------
// Scenario 5 — Profile: @name shown when profile has a name
// ---------------------------------------------------------------------------
describe('NotificationFormattingService – Scenario 5: profile name', () => {
  let service: NotificationFormattingService;

  beforeAll(async () => {
    service = await buildService();
  });

  it('includes @name inside the profile link when profile has a name', () => {
    const msg = service.format(FULL_ACTIVITY, { name: 'alice' });
    expect(msg).toContain(
      '<a href="https://polymarket.com/0xabc123"> @alice</a>',
    );
  });

  it('does not append @name when profile has no name', () => {
    const msg = service.format(FULL_ACTIVITY, { pseudonym: 'anon42' });
    expect(msg).not.toContain(' @');
  });

  it('does not append @name when profile is null', () => {
    const msg = service.format(FULL_ACTIVITY, null);
    expect(msg).not.toContain(' @');
  });

  it('does not append @name when profile is undefined', () => {
    const msg = service.format(FULL_ACTIVITY, undefined);
    expect(msg).not.toContain(' @');
  });
});
