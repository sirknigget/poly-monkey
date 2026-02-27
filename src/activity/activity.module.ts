import { Module } from '@nestjs/common';
import { LoggingModule } from '../logging/logging.module';
import { PolymarketApiModule } from '../polymarket-api/polymarket-api.module';
import { ActivityService } from './activity.service';

@Module({
  imports: [PolymarketApiModule, LoggingModule],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
