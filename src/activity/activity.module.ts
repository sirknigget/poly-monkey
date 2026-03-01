import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggingModule } from '../logging/logging.module';
import { NotificationModule } from '../notification/notification.module';
import { PolymarketApiModule } from '../polymarket-api/polymarket-api.module';
import { TransactionLogModule } from '../transaction-log/transaction-log.module';
import { ActivityNotifierController } from './activity-notifier.controller';
import { ActivityNotifierService } from './activity-notifier.service';
import { ActivityService } from './activity.service';
import { ActivityDao } from './activity.dao';
import { PolymarketActivity } from './activity.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PolymarketActivity]),
    PolymarketApiModule,
    LoggingModule,
    TransactionLogModule,
    NotificationModule,
  ],
  controllers: [ActivityNotifierController],
  providers: [ActivityService, ActivityNotifierService, ActivityDao],
  exports: [ActivityService, ActivityNotifierService, ActivityDao],
})
export class ActivityModule {}
