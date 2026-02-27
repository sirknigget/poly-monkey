import { TestBed, Mocked } from '@suites/unit';
import { ActivityNotifierService } from './activity-notifier.service';
import { ActivityService } from './activity.service';
import { TransactionLogDao } from '../transaction-log/transaction-log.dao';
import { NotificationFormattingService } from '../notification/notification-formatting.service';
import { TelegramService } from '../notification/telegram.service';
import { PolymarketActivity } from './activity.types';

const makeActivity = (
  hashes: string[],
  overrides: Partial<PolymarketActivity> = {},
): PolymarketActivity => ({
  transactionHashes: hashes,
  date: '1/1/2025, 12:00:00 AM',
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
  let mockFormattingService: Mocked<NotificationFormattingService>;
  let mockTelegramService: Mocked<TelegramService>;

  beforeAll(async () => {
    const { unit, unitRef } = await TestBed.solitary(
      ActivityNotifierService,
    ).compile();
    service = unit;
    mockActivityService = unitRef.get(ActivityService);
    mockTransactionLogDao = unitRef.get(TransactionLogDao);
    mockFormattingService = unitRef.get(NotificationFormattingService);
    mockTelegramService = unitRef.get(TelegramService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactionLogDao.existsByTransactionHash.mockResolvedValue(false);
    mockTransactionLogDao.add.mockResolvedValue(undefined);
    mockTransactionLogDao.deleteOlderThan.mockResolvedValue(undefined);
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

    it('sends a notification for each activity, persists all hashes, and cleans up', async () => {
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
      expect(mockTransactionLogDao.add).toHaveBeenCalledWith('0xAAA');
      expect(mockTransactionLogDao.add).toHaveBeenCalledWith('0xBBB');
      expect(mockTransactionLogDao.deleteOlderThan).toHaveBeenCalledWith(1);
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

    it('sends notifications only for new activities and persists only their hashes', async () => {
      await service.notifyNewActivities('0xuser', 50);

      expect(mockTelegramService.sendMessage).toHaveBeenCalledTimes(1);
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        '<b>New Event</b>',
      );
      expect(mockTransactionLogDao.add).toHaveBeenCalledWith('0xNEW');
      expect(mockTransactionLogDao.add).not.toHaveBeenCalledWith('0xALREADY');
      expect(mockTransactionLogDao.deleteOlderThan).toHaveBeenCalledWith(1);
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
      expect(mockTransactionLogDao.add).not.toHaveBeenCalled();
      expect(mockTransactionLogDao.deleteOlderThan).toHaveBeenCalledWith(1);
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

    it('sends no notifications, persists no hashes, and still runs cleanup', async () => {
      await service.notifyNewActivities('0xuser', 50);

      expect(mockTelegramService.sendMessage).not.toHaveBeenCalled();
      expect(mockTransactionLogDao.add).not.toHaveBeenCalled();
      expect(mockTransactionLogDao.deleteOlderThan).toHaveBeenCalledWith(1);
    });
  });

  describe('when ActivityService returns no activities', () => {
    beforeEach(() => {
      mockActivityService.fetchActivities.mockResolvedValue([]);
    });

    it('sends no notifications, persists no hashes, and still runs cleanup', async () => {
      await service.notifyNewActivities('0xuser', 50);

      expect(mockTelegramService.sendMessage).not.toHaveBeenCalled();
      expect(mockTransactionLogDao.add).not.toHaveBeenCalled();
      expect(mockTransactionLogDao.deleteOlderThan).toHaveBeenCalledWith(1);
    });
  });
});
