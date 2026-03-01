import { TestBed, Mocked } from '@suites/unit';
import { ActivityNotifierService } from './activity-notifier.service';
import { ActivityService } from './activity.service';
import { ActivityDao } from './activity.dao';
import { NotificationFormattingService } from '../notification/notification-formatting.service';
import { TelegramService } from '../notification/telegram.service';
import { UserAddressDao } from '../user-address/user-address.dao';
import { PolymarketActivity } from './activity.entity';

const makeActivity = (
  overrides: Partial<PolymarketActivity> = {},
): PolymarketActivity => ({
  transactionHashes: ['0xAAA'],
  timestamp: new Date('2025-01-01T00:00:00.000Z'),
  eventTitle: 'Test Event',
  eventLink: 'https://polymarket.com/event/test',
  marketSlug: 'test-slug',
  outcomePurchased: 'Yes',
  side: 'BUY',
  totalPriceUsd: 10,
  numTokens: 20,
  avgPricePerToken: 0.5,
  activityCount: 1,
  orders: [{ tokenPrice: 0.5, numTokens: 20, priceUsdt: 10 }],
  ...overrides,
});

describe('ActivityNotifierService', () => {
  let service: ActivityNotifierService;
  let mockActivityService: Mocked<ActivityService>;
  let mockActivityDao: Mocked<ActivityDao>;
  let mockFormattingService: Mocked<NotificationFormattingService>;
  let mockTelegramService: Mocked<TelegramService>;
  let mockUserAddressDao: Mocked<UserAddressDao>;

  beforeAll(async () => {
    const { unit, unitRef } = await TestBed.solitary(
      ActivityNotifierService,
    ).compile();
    service = unit;
    mockActivityService = unitRef.get(ActivityService);
    mockActivityDao = unitRef.get(ActivityDao);
    mockFormattingService = unitRef.get(NotificationFormattingService);
    mockTelegramService = unitRef.get(TelegramService);
    mockUserAddressDao = unitRef.get(UserAddressDao);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserAddressDao.findAll.mockResolvedValue(['0xuser']);
    mockActivityDao.existsByAggregationKey.mockResolvedValue(false);
    mockActivityDao.add.mockResolvedValue(undefined);
    mockActivityDao.deleteOlderThan.mockResolvedValue(undefined);
    mockTelegramService.sendMessage.mockResolvedValue(undefined);
    mockFormattingService.format.mockReturnValue('<b>Test Message</b>');
  });

  describe('when all activities are new', () => {
    beforeEach(() => {
      mockActivityService.fetchActivities.mockResolvedValue([
        makeActivity({ marketSlug: 'market-a', eventTitle: 'Event A' }),
        makeActivity({ marketSlug: 'market-b', eventTitle: 'Event B' }),
      ]);
      mockFormattingService.format.mockImplementation(
        (a) => `<b>${a.eventTitle}</b>`,
      );
    });

    it('sends a notification for each activity, saves each activity, and cleans up', async () => {
      await service.notifyNewActivities();

      expect(mockTelegramService.sendMessage).toHaveBeenCalledTimes(2);
      expect(mockTelegramService.sendMessage).toHaveBeenNthCalledWith(
        1,
        '<b>Event A</b>',
      );
      expect(mockTelegramService.sendMessage).toHaveBeenNthCalledWith(
        2,
        '<b>Event B</b>',
      );
      expect(mockActivityDao.add).toHaveBeenCalledTimes(2);
      expect(mockActivityDao.add).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ eventTitle: 'Event A' }),
      );
      expect(mockActivityDao.add).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ eventTitle: 'Event B' }),
      );
      expect(mockActivityDao.deleteOlderThan).toHaveBeenCalledTimes(1);
    });
  });

  describe('when some activities already exist in the dao', () => {
    beforeEach(() => {
      mockActivityService.fetchActivities.mockResolvedValue([
        makeActivity({ marketSlug: 'old-market', eventTitle: 'Old Event' }),
        makeActivity({ marketSlug: 'new-market', eventTitle: 'New Event' }),
      ]);
      mockActivityDao.existsByAggregationKey.mockImplementation(
        (_ts, marketSlug) => Promise.resolve(marketSlug === 'old-market'),
      );
      mockFormattingService.format.mockImplementation(
        (a) => `<b>${a.eventTitle}</b>`,
      );
    });

    it('sends notifications only for new activities and saves only new ones', async () => {
      await service.notifyNewActivities();

      expect(mockTelegramService.sendMessage).toHaveBeenCalledTimes(1);
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        '<b>New Event</b>',
      );
      expect(mockActivityDao.add).toHaveBeenCalledTimes(1);
      expect(mockActivityDao.add).toHaveBeenCalledWith(
        expect.objectContaining({ eventTitle: 'New Event' }),
      );
      expect(mockActivityDao.deleteOlderThan).toHaveBeenCalledTimes(1);
    });
  });

  describe('when all activities already exist in the dao', () => {
    beforeEach(() => {
      mockActivityService.fetchActivities.mockResolvedValue([
        makeActivity({ marketSlug: 'old-1' }),
        makeActivity({ marketSlug: 'old-2' }),
      ]);
      mockActivityDao.existsByAggregationKey.mockResolvedValue(true);
    });

    it('sends no notifications, saves no activities, and still runs cleanup', async () => {
      await service.notifyNewActivities();

      expect(mockTelegramService.sendMessage).not.toHaveBeenCalled();
      expect(mockActivityDao.add).not.toHaveBeenCalled();
      expect(mockActivityDao.deleteOlderThan).toHaveBeenCalledTimes(1);
    });
  });

  describe('when ActivityService returns no activities', () => {
    beforeEach(() => {
      mockActivityService.fetchActivities.mockResolvedValue([]);
    });

    it('sends no notifications, saves no activities, and still runs cleanup', async () => {
      await service.notifyNewActivities();

      expect(mockTelegramService.sendMessage).not.toHaveBeenCalled();
      expect(mockActivityDao.add).not.toHaveBeenCalled();
      expect(mockActivityDao.deleteOlderThan).toHaveBeenCalledTimes(1);
    });
  });

  describe('when no addresses are configured', () => {
    beforeEach(() => {
      mockUserAddressDao.findAll.mockResolvedValue([]);
    });

    it('sends no notifications and performs no cleanup', async () => {
      await service.notifyNewActivities();

      expect(mockActivityService.fetchActivities).not.toHaveBeenCalled();
      expect(mockTelegramService.sendMessage).not.toHaveBeenCalled();
      expect(mockActivityDao.deleteOlderThan).not.toHaveBeenCalled();
    });
  });

  describe('when multiple addresses are configured', () => {
    beforeEach(() => {
      mockUserAddressDao.findAll.mockResolvedValue(['0xAAA', '0xBBB']);
      mockActivityService.fetchActivities.mockResolvedValue([
        makeActivity({ eventTitle: 'Event' }),
      ]);
      mockFormattingService.format.mockReturnValue('<b>Event</b>');
    });

    it('processes each address independently', async () => {
      await service.notifyNewActivities();

      expect(mockActivityService.fetchActivities).toHaveBeenCalledTimes(2);
      expect(mockActivityService.fetchActivities).toHaveBeenNthCalledWith(
        1,
        '0xAAA',
        expect.any(Number),
        expect.any(Number),
      );
      expect(mockActivityService.fetchActivities).toHaveBeenNthCalledWith(
        2,
        '0xBBB',
        expect.any(Number),
        expect.any(Number),
      );
      expect(mockActivityDao.deleteOlderThan).toHaveBeenCalledTimes(2);
    });
  });
});
