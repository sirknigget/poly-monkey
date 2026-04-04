import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationFormattingService } from '../notification/notification-formatting.service';
import { TelegramService } from '../notification/telegram.service';
import { UserAddress } from '../user-address/user-address.entity';
import { UserAddressDao } from '../user-address/user-address.dao';
import { ActivityService } from './activity.service';
import { ActivityDao } from './activity.dao';

const ACTIVITY_RETENTION_DAYS = 7;

@Injectable()
export class ActivityNotifierService {
  constructor(
    private readonly activityService: ActivityService,
    private readonly activityDao: ActivityDao,
    private readonly notificationFormattingService: NotificationFormattingService,
    private readonly telegramService: TelegramService,
    private readonly userAddressDao: UserAddressDao,
    private readonly logger: Logger,
    private readonly configService: ConfigService,
  ) {}

  async notifyNewActivities(): Promise<void> {
    const users = await this.userAddressDao.findAll();

    this.logger.log(
      `Found ${users.length} user addresses to check for activities`,
    );

    for (const user of users) {
      await this.notifyForAddress(user);
    }
  }

  private async notifyForAddress(user: UserAddress): Promise<void> {
    const fetchLimit = this.configService.getOrThrow<number>(
      'ACTIVITY_FETCH_LIMIT',
    );
    const lookbackMs = this.configService.getOrThrow<number>(
      'ACTIVITY_LOOKBACK_MS',
    );
    const activities = await this.activityService.fetchActivities(
      user.address,
      fetchLimit,
      Date.now() - lookbackMs,
    );

    const existsResults = await Promise.all(
      activities.map((activity) =>
        this.activityDao.existsByAggregationKey(
          activity.timestamp,
          activity.marketSlug,
          activity.outcomePurchased,
          activity.side,
          activity.userAddress,
        ),
      ),
    );
    const newActivities = activities.filter((_, i) => !existsResults[i]);

    this.logger.log(
      `Sending notifications for ${newActivities.length} new activities`,
    );

    const sendResults = await Promise.allSettled(
      newActivities.map((activity) => {
        const message = this.notificationFormattingService.format(
          activity,
          user.profile,
        );
        return this.telegramService.sendMessage(message);
      }),
    );
    const sentActivities = newActivities.filter(
      (_, i) => sendResults[i].status === 'fulfilled',
    );
    if (sentActivities.length > 0) {
      await this.activityDao.addAll(sentActivities);
    }

    this.logger.log(
      `Finished processing activities for address ${user.address}. ${newActivities.length} new notifications sent, ${sentActivities.length} activities added to db.`,
    );

    const activityCutoff = new Date(
      Date.now() - ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    await this.activityDao.deleteOlderThan(activityCutoff);
  }
}
