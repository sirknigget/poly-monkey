import { TestBed } from '@suites/unit';
import { NotificationFormattingService } from './notification-formatting.service';
import { PolymarketActivity } from '../activity/activity.types';

const FULL_ACTIVITY: PolymarketActivity = {
  transactionHash: '0xAAA',
  date: '1/1/2024, 12:00:00 AM',
  eventTitle: 'Will Bitcoin hit $100k?',
  eventLink: 'https://polymarket.com/event/bitcoin-100k',
  marketSlug: 'bitcoin-100k-jan',
  outcomePurchased: 'Yes',
  side: 'BUY',
  totalPriceUsd: 10.5,
  numTokens: 21.0,
  avgPricePerToken: 0.5,
  activityCount: 1,
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
    expect(msg).toContain('1/1/2024, 12:00:00 AM');
  });

  it('includes the activityCount', () => {
    const msg = service.format(FULL_ACTIVITY);
    expect(msg).toContain('1');
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
    expect(msg).not.toContain('<a href');
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
