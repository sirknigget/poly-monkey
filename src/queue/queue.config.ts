import { ConfigService } from '@nestjs/config';
import {
  BullRootModuleOptions,
  SharedBullAsyncConfiguration,
} from '@nestjs/bullmq';

export const bullConfig: SharedBullAsyncConfiguration = {
  inject: [ConfigService],
  useFactory: (configService: ConfigService): BullRootModuleOptions => ({
    connection: {
      host: configService.getOrThrow<string>('REDIS_HOST'),
      port: configService.getOrThrow<number>('REDIS_PORT'),
    },
  }),
};
