import { Module } from '@nestjs/common';
import { LoggingModule } from '../logging/logging.module';
import { NotificationFormattingService } from './notification-formatting.service';
import { TelegramService } from './telegram.service';

@Module({
  imports: [LoggingModule],
  providers: [NotificationFormattingService, TelegramService],
  exports: [NotificationFormattingService, TelegramService],
})
export class NotificationModule {}
