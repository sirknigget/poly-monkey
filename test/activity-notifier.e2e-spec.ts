import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { typeOrmConfig } from '../src/config/database.config';
import { ActivityModule } from '../src/activity/activity.module';
import { PolymarketActivity } from '../src/activity/activity.entity';
import { TransactionLog } from '../src/transaction-log/transaction-log.entity';
import { TransactionLogModule } from '../src/transaction-log/transaction-log.module';
import { TransactionLogDao } from '../src/transaction-log/transaction-log.dao';

const TEST_ADDRESS = '0x2005d16a84ceefa912d4e380cd32e7ff827875ea';
const DEFAULT_LIMIT = 10;

describe('ActivityNotifierController (e2e)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let transactionLogRepository: Repository<TransactionLog>;
  let activityRepository: Repository<PolymarketActivity>;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync(typeOrmConfig),
        ActivityModule,
        TransactionLogModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(new Logger());
    await app.init();

    transactionLogRepository = moduleFixture.get<Repository<TransactionLog>>(
      getRepositoryToken(TransactionLog),
    );
    activityRepository = moduleFixture.get<Repository<PolymarketActivity>>(
      getRepositoryToken(PolymarketActivity),
    );

    // Ensure a clean slate regardless of previous interrupted runs.
    await transactionLogRepository.clear();
    await activityRepository.clear();
  });

  afterAll(async () => {
    // Clean up DB state so re-runs see fresh activities and the pipeline executes fully.
    await transactionLogRepository.clear();
    await activityRepository.clear();
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

    await request(app.getHttpServer())
      .post('/activity/notify')
      .send({ userAddress: TEST_ADDRESS, limit: DEFAULT_LIMIT })
      .expect(200);

    const txLogs = await transactionLogRepository.find();
    expect(txLogs.length).toBeGreaterThan(0);
    txLogs.forEach((log) => {
      expect(typeof log.transactionHash).toBe('string');
      expect(log.transactionHash.length).toBeGreaterThan(0);
      expect(log.createdAt).toBeInstanceOf(Date);
    });

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
