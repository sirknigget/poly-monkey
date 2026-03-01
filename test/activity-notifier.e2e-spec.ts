import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { typeOrmConfig } from '../src/database/database.config';
import { ActivityModule } from '../src/activity/activity.module';
import { UserAddressModule } from '../src/user-address/user-address.module';
import { UserAddressDao } from '../src/user-address/user-address.dao';
import { UserAddress } from '../src/user-address/user-address.entity';
import { PolymarketActivity } from '../src/activity/activity.entity';

const TEST_ADDRESS = '0x2005d16a84ceefa912d4e380cd32e7ff827875ea';

describe('ActivityNotifierController (e2e)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let activityRepository: Repository<PolymarketActivity>;
  let userAddressRepository: Repository<UserAddress>;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync(typeOrmConfig),
        ActivityModule,
        UserAddressModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(new Logger());
    await app.init();

    activityRepository = moduleFixture.get<Repository<PolymarketActivity>>(
      getRepositoryToken(PolymarketActivity),
    );
    userAddressRepository = moduleFixture.get<Repository<UserAddress>>(
      getRepositoryToken(UserAddress),
    );

    await activityRepository.clear();
    await userAddressRepository.clear();

    const userAddressDao = moduleFixture.get<UserAddressDao>(UserAddressDao);
    await userAddressDao.add(TEST_ADDRESS);
  });

  afterAll(async () => {
    await activityRepository.clear();
    await userAddressRepository.clear();
    await app.close();
  });

  it('POST /activity/notify runs the full notification pipeline for a known-active address (live)', async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatIds = process.env.TELEGRAM_CHAT_IDS;

    if (!token || !chatIds) {
      throw new Error(
        'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_IDS not set in .env file. Please add them before running this e2e test.',
      );
    }

    await request(app.getHttpServer()).post('/activity/notify').expect(200);

    const activities = await activityRepository.find();
    expect(activities.length).toBeGreaterThan(0);
    activities.forEach((activity) => {
      expect(Array.isArray(activity.transactionHashes)).toBe(true);
      expect(activity.transactionHashes.length).toBeGreaterThan(0);
      expect(typeof activity.eventTitle).toBe('string');
      expect(activity.eventTitle.length).toBeGreaterThan(0);
      expect(activity.totalPriceUsd).toBeGreaterThan(0);
      expect(activity.timestamp).toBeInstanceOf(Date);
    });
  });
});
