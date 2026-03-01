import { Injectable, Logger } from '@nestjs/common';
import { TransactionLogDao } from '../transaction-log/transaction-log.dao';
import { NotificationFormattingService } from '../notification/notification-formatting.service';
import { TelegramService } from '../notification/telegram.service';
import { ActivityService } from './activity.service';
import { ActivityDao } from './activity.dao';

const TRANSACTION_LOG_RETENTION_HOURS = 1;
const ACTIVITY_RETENTION_DAYS = 60;

@Injectable()
export class ActivityNotifierService {
  constructor(
    private readonly activityService: ActivityService,
    private readonly transactionLogDao: TransactionLogDao,
    private readonly activityDao: ActivityDao,
    private readonly notificationFormattingService: NotificationFormattingService,
    private readonly telegramService: TelegramService,
    private readonly logger: Logger,
  ) {}

  async notifyNewActivities(userAddress: string, limit: number): Promise<void> {
    const activities = await this.activityService.fetchActivities(
      userAddress,
      limit,
    );

    const alreadyProcessed = await Promise.all(
      activities.map((a) =>
        Promise.all(
          a.transactionHashes.map((h) =>
            this.transactionLogDao.existsByTransactionHash(h),
          ),
        ).then((results) => results.some(Boolean)),
      ),
    );
    const newActivities = activities.filter((_, i) => !alreadyProcessed[i]);

    this.logger.log(
      `Sending notifications for ${newActivities.length} new activities`,
    );

    for (const activity of newActivities) {
      const message = this.notificationFormattingService.format(activity);
      await this.telegramService.sendMessage(message);
      await this.activityDao.add(activity);
    }

    const allHashes = newActivities.flatMap((a) => a.transactionHashes);
    await Promise.all(allHashes.map((h) => this.transactionLogDao.add(h)));
    await this.transactionLogDao.deleteOlderThan(
      TRANSACTION_LOG_RETENTION_HOURS,
    );

    const activityCutoff = new Date(
      Date.now() - ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    await this.activityDao.deleteOlderThan(activityCutoff);
  }
}
