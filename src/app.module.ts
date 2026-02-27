import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeOrmConfig } from './config/database.config';
import { ActivityModule } from './activity/activity.module';
import { NotificationModule } from './notification/notification.module';
import { TransactionLogModule } from './transaction-log/transaction-log.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync(typeOrmConfig),
    ActivityModule,
    NotificationModule,
    TransactionLogModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
