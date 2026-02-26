import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PolymarketApiService } from './polymarket-api.service';

@Module({
  imports: [HttpModule],
  providers: [PolymarketApiService],
  exports: [PolymarketApiService],
})
export class PolymarketApiModule {}
