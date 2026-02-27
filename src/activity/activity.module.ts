import { Module } from '@nestjs/common';
import { LoggingModule } from '../logging/logging.module';
import { NotificationModule } from '../notification/notification.module';
import { PolymarketApiModule } from '../polymarket-api/polymarket-api.module';
import { TransactionLogModule } from '../transaction-log/transaction-log.module';
import { ActivityNotifierService } from './activity-notifier.service';
import { ActivityService } from './activity.service';

@Module({
  imports: [
    PolymarketApiModule,
    LoggingModule,
    TransactionLogModule,
    NotificationModule,
  ],
  providers: [ActivityService, ActivityNotifierService],
  exports: [ActivityService, ActivityNotifierService],
})
export class ActivityModule {}
