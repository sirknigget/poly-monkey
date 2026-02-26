import { Module } from '@nestjs/common';
import { PolymarketApiModule } from '../polymarket-api/polymarket-api.module';
import { ActivityService } from './activity.service';

@Module({
  imports: [PolymarketApiModule],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
