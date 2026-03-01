import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationFormattingService } from '../notification/notification-formatting.service';
import { TelegramService } from '../notification/telegram.service';
import { ActivityService } from './activity.service';
import { ActivityDao } from './activity.dao';
import { PolymarketActivity } from './activity.entity';

const FETCH_LIMIT = 100;
const ACTIVITY_RETENTION_DAYS = 60;
const ACTIVITY_LOOKBACK_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class ActivityNotifierService {
  constructor(
    private readonly activityService: ActivityService,
    private readonly activityDao: ActivityDao,
    private readonly notificationFormattingService: NotificationFormattingService,
    private readonly telegramService: TelegramService,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {}

  async notifyNewActivities(): Promise<void> {
    const addressesRaw = this.configService.getOrThrow<string>(
      'POLYMARKET_USER_ADDRESSES',
    );
    const addresses = addressesRaw.split(',').map((a) => a.trim());

    for (const address of addresses) {
      await this.notifyForAddress(address);
    }
  }

  private async notifyForAddress(userAddress: string): Promise<void> {
    const activities = await this.activityService.fetchActivities(
      userAddress,
      FETCH_LIMIT,
      Date.now() - ACTIVITY_LOOKBACK_MS,
    );

    const existsResults = await Promise.all(
      activities.map((activity) =>
        this.activityDao.existsByAggregationKey(
          activity.timestamp,
          activity.marketSlug,
          activity.outcomePurchased,
          activity.side,
        ),
      ),
    );
    const newActivities = activities.filter((_, i) => !existsResults[i]);

    this.logger.log(
      `Sending notifications for ${newActivities.length} new activities`,
    );

    for (const activity of newActivities) {
      const message = this.notificationFormattingService.format(activity);
      await this.telegramService.sendMessage(message);
      await this.activityDao.add(activity);
    }

    const activityCutoff = new Date(
      Date.now() - ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    await this.activityDao.deleteOlderThan(activityCutoff);
  }
}
