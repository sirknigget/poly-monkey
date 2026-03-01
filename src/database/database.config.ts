import { ConfigService } from '@nestjs/config';
import {
  TypeOrmModuleAsyncOptions,
  TypeOrmModuleOptions,
} from '@nestjs/typeorm';
import type { DataSourceOptions, LogLevel } from 'typeorm';

export function buildTypeOrmOptions(
  get: (key: string) => string,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: get('DB_HOST'),
    port: Number(get('DB_PORT')),
    username: get('DB_USERNAME'),
    password: get('DB_PASSWORD'),
    database: get('DB_DATABASE'),
    synchronize: false,
    ssl: { rejectUnauthorized: false },
    logging: ['error', 'schema', 'migration'],
  };
}

export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    ...buildTypeOrmOptions((key) => configService.getOrThrow<string>(key)),
    autoLoadEntities: true,
    migrations: ['dist/database/migrations/*.js'],
    migrationsRun: true,
  }),
};
