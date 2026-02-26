import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ResearchModule } from './research/polymarket-activity.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [ResearchModule, NotificationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
