import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeOrmConfig } from './database/database.config';
import { bullConfig } from './queue/queue.config';
import { ActivityModule } from './activity/activity.module';
import { NotificationModule } from './notification/notification.module';
import { LoggingModule } from './logging/logging.module';
import { UserAddressModule } from './user-address/user-address.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync(typeOrmConfig),
    BullModule.forRootAsync(bullConfig),
    ActivityModule,
    NotificationModule,
    LoggingModule,
    UserAddressModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
