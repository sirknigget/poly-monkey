import { TestBed, Mocked } from '@suites/unit';
import { ActivityNotifierService } from './activity-notifier.service';
import { ActivityService } from './activity.service';
import { ActivityDao } from './activity.dao';
import { TransactionLogDao } from '../transaction-log/transaction-log.dao';
import { NotificationFormattingService } from '../notification/notification-formatting.service';
import { TelegramService } from '../notification/telegram.service';
import { PolymarketActivity } from './activity.entity';

const makeActivity = (
  hashes: string[],
  overrides: Partial<PolymarketActivity> = {},
): PolymarketActivity => ({
  transactionHashes: hashes,
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
  let mockTransactionLogDao: Mocked<TransactionLogDao>;
  let mockActivityDao: Mocked<ActivityDao>;
  let mockFormattingService: Mocked<NotificationFormattingService>;
  let mockTelegramService: Mocked<TelegramService>;

  beforeAll(async () => {
    const { unit, unitRef } = await TestBed.solitary(
      ActivityNotifierService,
    ).compile();
    service = unit;
    mockActivityService = unitRef.get(ActivityService);
    mockTransactionLogDao = unitRef.get(TransactionLogDao);
    mockActivityDao = unitRef.get(ActivityDao);
    mockFormattingService = unitRef.get(NotificationFormattingService);
    mockTelegramService = unitRef.get(TelegramService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactionLogDao.existsByTransactionHash.mockResolvedValue(false);
    mockTransactionLogDao.add.mockResolvedValue(undefined);
    mockTransactionLogDao.deleteOlderThan.mockResolvedValue(undefined);
    mockActivityDao.add.mockResolvedValue(undefined);
    mockActivityDao.deleteOlderThan.mockResolvedValue(undefined);
    mockTelegramService.sendMessage.mockResolvedValue(undefined);
    mockFormattingService.format.mockReturnValue('<b>Test Message</b>');
  });

  describe('when all activities are new (no hashes in the log)', () => {
    beforeEach(() => {
      mockActivityService.fetchActivities.mockResolvedValue([
        makeActivity(['0xAAA'], { eventTitle: 'Event A' }),
        makeActivity(['0xBBB'], { eventTitle: 'Event B' }),
      ]);
      mockFormattingService.format.mockImplementation(
        (a) => `<b>${a.eventTitle}</b>`,
      );
    });

    it('sends a notification for each activity, saves each activity, persists all hashes, and cleans up', async () => {
      await service.notifyNewActivities('0xuser', 50);

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
      expect(mockTransactionLogDao.add).toHaveBeenCalledWith('0xAAA');
      expect(mockTransactionLogDao.add).toHaveBeenCalledWith('0xBBB');
      expect(mockTransactionLogDao.deleteOlderThan).toHaveBeenCalledWith(1);
      expect(mockActivityDao.deleteOlderThan).toHaveBeenCalledTimes(1);
    });
  });

  describe('when some activities are already logged', () => {
    beforeEach(() => {
      mockActivityService.fetchActivities.mockResolvedValue([
        makeActivity(['0xALREADY'], { eventTitle: 'Old Event' }),
        makeActivity(['0xNEW'], { eventTitle: 'New Event' }),
      ]);
      mockTransactionLogDao.existsByTransactionHash.mockImplementation((h) =>
        Promise.resolve(h === '0xALREADY'),
      );
      mockFormattingService.format.mockImplementation(
        (a) => `<b>${a.eventTitle}</b>`,
      );
    });

    it('sends notifications only for new activities, saves only new activities, and persists only their hashes', async () => {
      await service.notifyNewActivities('0xuser', 50);

      expect(mockTelegramService.sendMessage).toHaveBeenCalledTimes(1);
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        '<b>New Event</b>',
      );
      expect(mockActivityDao.add).toHaveBeenCalledTimes(1);
      expect(mockActivityDao.add).toHaveBeenCalledWith(
        expect.objectContaining({ eventTitle: 'New Event' }),
      );
      expect(mockTransactionLogDao.add).toHaveBeenCalledWith('0xNEW');
      expect(mockTransactionLogDao.add).not.toHaveBeenCalledWith('0xALREADY');
      expect(mockTransactionLogDao.deleteOlderThan).toHaveBeenCalledWith(1);
      expect(mockActivityDao.deleteOlderThan).toHaveBeenCalledTimes(1);
    });
  });

  describe('when an activity has multiple hashes and any is already logged', () => {
    beforeEach(() => {
      mockActivityService.fetchActivities.mockResolvedValue([
        makeActivity(['0xOLD', '0xALSO_NEW'], { eventTitle: 'Partial Event' }),
      ]);
      mockTransactionLogDao.existsByTransactionHash.mockImplementation((h) =>
        Promise.resolve(h === '0xOLD'),
      );
    });

    it('skips the activity entirely when any of its hashes is already logged', async () => {
      await service.notifyNewActivities('0xuser', 50);

      expect(mockTelegramService.sendMessage).not.toHaveBeenCalled();
      expect(mockActivityDao.add).not.toHaveBeenCalled();
      expect(mockTransactionLogDao.add).not.toHaveBeenCalled();
      expect(mockTransactionLogDao.deleteOlderThan).toHaveBeenCalledWith(1);
      expect(mockActivityDao.deleteOlderThan).toHaveBeenCalledTimes(1);
    });
  });

  describe('when all activities are already logged', () => {
    beforeEach(() => {
      mockActivityService.fetchActivities.mockResolvedValue([
        makeActivity(['0xOLD1']),
        makeActivity(['0xOLD2']),
      ]);
      mockTransactionLogDao.existsByTransactionHash.mockResolvedValue(true);
    });

    it('sends no notifications, saves no activities, persists no hashes, and still runs cleanup', async () => {
      await service.notifyNewActivities('0xuser', 50);

      expect(mockTelegramService.sendMessage).not.toHaveBeenCalled();
      expect(mockActivityDao.add).not.toHaveBeenCalled();
      expect(mockTransactionLogDao.add).not.toHaveBeenCalled();
      expect(mockTransactionLogDao.deleteOlderThan).toHaveBeenCalledWith(1);
      expect(mockActivityDao.deleteOlderThan).toHaveBeenCalledTimes(1);
    });
  });

  describe('when ActivityService returns no activities', () => {
    beforeEach(() => {
      mockActivityService.fetchActivities.mockResolvedValue([]);
    });

    it('sends no notifications, saves no activities, persists no hashes, and still runs cleanup', async () => {
      await service.notifyNewActivities('0xuser', 50);

      expect(mockTelegramService.sendMessage).not.toHaveBeenCalled();
      expect(mockActivityDao.add).not.toHaveBeenCalled();
      expect(mockTransactionLogDao.add).not.toHaveBeenCalled();
      expect(mockTransactionLogDao.deleteOlderThan).toHaveBeenCalledWith(1);
      expect(mockActivityDao.deleteOlderThan).toHaveBeenCalledTimes(1);
    });
  });
});
