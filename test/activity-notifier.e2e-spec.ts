import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { typeOrmConfig } from '../src/database/database.config';
import { bullConfig } from '../src/queue/queue.config';
import { ActivityModule } from '../src/activity/activity.module';
import { UserAddressModule } from '../src/user-address/user-address.module';
import { UserAddressDao } from '../src/user-address/user-address.dao';
import { UserAddress } from '../src/user-address/user-address.entity';
import { PolymarketActivity } from '../src/activity/activity.entity';
import { AdminAuthGuard } from '../src/auth/admin-auth.guard';
import { ACTIVITY_NOTIFIER_QUEUE } from '../src/activity/activity-notifier-queue.constants';

const TEST_ADDRESS = '0x2005d16a84ceefa912d4e380cd32e7ff827875ea';

async function waitForQueueToDrain(
  queue: Queue,
  baselineFailedCount: number,
  timeoutMs = 30000,
): Promise<void> {
  const start = Date.now();
  await new Promise((r) => setTimeout(r, 200));
  while (Date.now() - start < timeoutMs) {
    const counts = await queue.getJobCounts(
      'waiting',
      'active',
      'delayed',
      'failed',
    );
    if (counts.failed > baselineFailedCount) {
      const [failedJob] = await queue.getFailed(0, 0);
      throw new Error(
        `Job failed: ${failedJob?.failedReason}\n${failedJob?.stacktrace}`,
      );
    }
    if (counts.waiting === 0 && counts.active === 0 && counts.delayed === 0) {
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Queue did not drain within ${timeoutMs}ms`);
}

describe('ActivityNotifierController (e2e)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let activityRepository: Repository<PolymarketActivity>;
  let userAddressRepository: Repository<UserAddress>;
  let queue: Queue;

  beforeAll(async () => {
    process.env.ACTIVITY_FETCH_LIMIT = '10';
    process.env.ACTIVITY_LOOKBACK_MS = String(60 * 60 * 1000); // 1 hour

    moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync(typeOrmConfig),
        BullModule.forRootAsync(bullConfig),
        ActivityModule,
        UserAddressModule,
      ],
    })
      .overrideGuard(AdminAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useLogger(new Logger());
    await app.init();

    activityRepository = moduleFixture.get<Repository<PolymarketActivity>>(
      getRepositoryToken(PolymarketActivity),
    );
    userAddressRepository = moduleFixture.get<Repository<UserAddress>>(
      getRepositoryToken(UserAddress),
    );
    queue = moduleFixture.get<Queue>(getQueueToken(ACTIVITY_NOTIFIER_QUEUE));

    await activityRepository.clear();
    await userAddressRepository.clear();

    const userAddressDao = moduleFixture.get<UserAddressDao>(UserAddressDao);
    await userAddressDao.add(TEST_ADDRESS);
  });

  afterAll(async () => {
    await activityRepository.clear();
    await userAddressRepository.clear();
    delete process.env.ACTIVITY_FETCH_LIMIT;
    delete process.env.ACTIVITY_LOOKBACK_MS;
    await app.close();
  });

  it('POST /activity/notify is non-blocking and the notification pipeline runs asynchronously (live)', async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatIds = process.env.TELEGRAM_CHAT_IDS;

    if (!token || !chatIds) {
      throw new Error(
        'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_IDS not set in .env file. Please add them before running this e2e test.',
      );
    }

    const { failed: baselineFailedCount } = await queue.getJobCounts('failed');

    const response = await request(app.getHttpServer())
      .post('/activity/notify')
      .expect(200);

    expect(response.text).toBe('Triggered');

    // The endpoint is non-blocking: activities are NOT in DB yet
    const immediateActivities = await activityRepository.find();
    expect(immediateActivities.length).toBe(0);

    // Wait for the queue job to complete asynchronously
    await waitForQueueToDrain(queue, baselineFailedCount);

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
