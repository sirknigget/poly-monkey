import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { NotificationModule } from '../src/notification/notification.module';
import { TelegramService } from '../src/notification/telegram.service';
import { NotificationFormattingService } from '../src/notification/notification-formatting.service';
import * as path from 'path';
import { PolymarketActivity } from '../src/activity/activity.types';

describe('Notification Integration (e2e)', () => {
  let moduleFixture: TestingModule;
  let telegramService: TelegramService;
  let formattingService: NotificationFormattingService;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: path.resolve(__dirname, '../.env'),
        }),
        NotificationModule,
      ],
    }).compile();

    telegramService = moduleFixture.get<TelegramService>(TelegramService);
    formattingService = moduleFixture.get<NotificationFormattingService>(
      NotificationFormattingService,
    );
  });

  afterAll(async () => {
    await moduleFixture.close();
  });

  it('should format a mock activity and send it via Telegram (live API)', async () => {
    // Check if variables are set (ConfigModule.forRoot populates process.env from .env)
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatIds = process.env.TELEGRAM_CHAT_IDS;

    if (!token || !chatIds) {
      throw new Error(
        'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_IDS not set in .env file. Please add them and save before running this e2e test.',
      );
    }

    const mockActivity: PolymarketActivity = {
      transactionHash: '0xmockhash1234567890abcdef',
      eventTitle: 'Integration Test Event: Will GPT-5 be released in 2026?',
      date: new Date().toISOString(),
      totalPriceUsd: 1337.42,
      numTokens: 2500,
      avgPricePerToken: 0.5349,
      outcomePurchased: 'Yes',
      side: 'BUY',
      activityCount: 3,
      marketSlug: 'gpt-5-released-2026',
      eventLink: 'https://polymarket.com/event/gpt-5-released-2026',
    };

    const formattedMessage = formattingService.format(mockActivity);

    // This should not throw if the API request succeeds.
    // If it throws, the test will fail, indicating a problem with the integration or credentials.
    await expect(
      telegramService.sendMessage(formattedMessage),
    ).resolves.not.toThrow();
  });
});
