import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { typeOrmConfig } from '../src/config/database.config';
import { ActivityModule } from '../src/activity/activity.module';
import { TransactionLog } from '../src/transaction-log/transaction-log.entity';
import { TransactionLogModule } from '../src/transaction-log/transaction-log.module';

const TEST_ADDRESS = '0x2005d16a84ceefa912d4e380cd32e7ff827875ea';
const DEFAULT_LIMIT = 50;

describe('ActivityNotifierController (e2e)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let transactionLogRepository: Repository<TransactionLog>;

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
    await app.init();

    transactionLogRepository = moduleFixture.get<Repository<TransactionLog>>(
      getRepositoryToken(TransactionLog),
    );
  });

  afterAll(async () => {
    // Clean up DB state so re-runs see fresh activities and the pipeline executes fully.
    await transactionLogRepository.clear();
    await app.close();
  });

  // AC: POST /activity/notify with a known-active address triggers the full pipeline:
  //     fetches activities from Polymarket, deduplicates via DB, sends Telegram messages,
  //     and persists transaction hashes.
  // Behavior: POST /activity/notify -> ActivityNotifierController -> ActivityNotifierService
  //           -> [fetchActivities + existsByTransactionHash + sendMessage + add] -> HTTP 200
  // @category: e2e
  // @dependency: ActivityNotifierController, ActivityNotifierService, Polymarket Data API (live),
  //              PostgreSQL (live), Telegram Bot API (live)
  // @complexity: high
  // ROI: 90 | Business Value: 9 (validates entire notification pipeline) | Frequency: 10
  it('POST /activity/notify runs the full notification pipeline for a known-active address (live)', async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatIds = process.env.TELEGRAM_CHAT_IDS;

    if (!token || !chatIds) {
      throw new Error(
        'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_IDS not set in .env file. Please add them before running this e2e test.',
      );
    }

    // Arrange: done in beforeAll (live DB and Telegram configured via .env)
    // Act
    await request(app.getHttpServer())
      .post('/activity/notify')
      .send({ userAddress: TEST_ADDRESS, limit: DEFAULT_LIMIT })
      // Assert: pipeline completes without error
      .expect(200);
  });
});
