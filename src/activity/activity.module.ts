import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { LoggingModule } from '../logging/logging.module';
import { NotificationModule } from '../notification/notification.module';
import { PolymarketApiModule } from '../polymarket-api/polymarket-api.module';
import { UserAddressModule } from '../user-address/user-address.module';
import { ActivityNotifierController } from './activity-notifier.controller';
import { ActivityNotifierService } from './activity-notifier.service';
import { ActivityNotifierQueueService } from './activity-notifier-queue.service';
import { ActivityNotifierProcessor } from './activity-notifier.processor';
import { ActivityService } from './activity.service';
import { ActivityDao } from './activity.dao';
import { PolymarketActivity } from './activity.entity';
import { ACTIVITY_NOTIFIER_QUEUE } from './activity-notifier-queue.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([PolymarketActivity]),
    BullModule.registerQueue({ name: ACTIVITY_NOTIFIER_QUEUE }),
    PolymarketApiModule,
    LoggingModule,
    NotificationModule,
    UserAddressModule,
  ],
  controllers: [ActivityNotifierController],
  providers: [
    ActivityService,
    ActivityNotifierService,
    ActivityNotifierQueueService,
    ActivityNotifierProcessor,
    ActivityDao,
    AdminAuthGuard,
  ],
  exports: [ActivityService, ActivityNotifierService, ActivityDao],
})
export class ActivityModule {}
