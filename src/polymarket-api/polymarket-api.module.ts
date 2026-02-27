import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LoggingModule } from '../logging/logging.module';
import { PolymarketApiService } from './polymarket-api.service';

@Module({
  imports: [HttpModule, LoggingModule],
  providers: [PolymarketApiService],
  exports: [PolymarketApiService],
})
export class PolymarketApiModule {}
