import { Module } from '@nestjs/common';
import { PolymarketActivityService } from './polymarket-activity.service';

@Module({
  providers: [PolymarketActivityService],
  exports: [PolymarketActivityService],
})
export class ResearchModule {}
