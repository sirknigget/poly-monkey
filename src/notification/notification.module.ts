import { Module } from '@nestjs/common';
import { NotificationFormattingService } from './notification-formatting.service';
import { TelegramService } from './telegram.service';

@Module({
  providers: [NotificationFormattingService, TelegramService],
  exports: [NotificationFormattingService, TelegramService],
})
export class NotificationModule {}
