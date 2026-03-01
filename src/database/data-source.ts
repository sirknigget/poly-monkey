import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './database.config';

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export default new DataSource({
  ...buildTypeOrmOptions(getEnv),
  migrations: ['src/database/migrations/*.ts'],
  entities: ['src/**/*.entity.ts'],
});
