import nock from 'nock';

const TELEGRAM_API_BASE_URL = 'https://api.telegram.org';
const MOCK_TELEGRAM_BOT_TOKEN = 'mock-telegram-bot-token';
const MOCK_TELEGRAM_CHAT_IDS = ['100001', '100002'];

export type TelegramMock = {
  getRequestCount: () => number;
  getChatIds: () => string[];
};

type TelegramSendMessageBody = {
  chat_id?: unknown;
  text?: unknown;
  parse_mode?: unknown;
};

export function configureMockTelegramEnv(): void {
  if (!shouldMockTelegram()) return;

  process.env.TELEGRAM_BOT_TOKEN = MOCK_TELEGRAM_BOT_TOKEN;
  process.env.TELEGRAM_CHAT_IDS = MOCK_TELEGRAM_CHAT_IDS.join(',');
  process.env.NO_PROXY = withTelegramNoProxy(process.env.NO_PROXY);
  process.env.no_proxy = withTelegramNoProxy(process.env.no_proxy);
}

export function shouldMockTelegram(): boolean {
  return process.env.TELEGRAM_E2E_MOCK === 'true';
}

export function mockTelegramSendMessage(): TelegramMock | undefined {
  if (!shouldMockTelegram()) return undefined;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = parseChatIds();
  const requestBodies: TelegramSendMessageBody[] = [];

  if (!token) {
    throw new Error(
      'TELEGRAM_BOT_TOKEN must be set when TELEGRAM_E2E_MOCK=true',
    );
  }

  if (chatIds.length === 0) {
    throw new Error(
      'TELEGRAM_CHAT_IDS must be set when TELEGRAM_E2E_MOCK=true',
    );
  }

  nock(TELEGRAM_API_BASE_URL)
    .persist()
    .post(`/bot${token}/sendMessage`, (body: TelegramSendMessageBody) => {
      if (!isExpectedSendMessageBody(body, chatIds)) return false;

      requestBodies.push(body);
      return true;
    })
    .reply(200, (_uri, body: TelegramSendMessageBody) => ({
      ok: true,
      result: {
        message_id: requestBodies.length,
        date: 1700000000,
        chat: {
          id: Number(body.chat_id),
          type: 'private',
        },
        text: body.text,
      },
    }));

  return {
    getRequestCount: () => requestBodies.length,
    getChatIds: () => chatIds,
  };
}

export function cleanTelegramMock(): void {
  if (!shouldMockTelegram()) return;

  nock.cleanAll();
}

function withTelegramNoProxy(value: string | undefined): string {
  const entries = (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return entries.includes('api.telegram.org')
    ? entries.join(',')
    : [...entries, 'api.telegram.org'].join(',');
}

function parseChatIds(): string[] {
  return (process.env.TELEGRAM_CHAT_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

function isExpectedSendMessageBody(
  body: TelegramSendMessageBody,
  chatIds: string[],
): boolean {
  return (
    typeof body.chat_id === 'string' &&
    chatIds.includes(body.chat_id) &&
    typeof body.text === 'string' &&
    body.text.length > 0 &&
    body.parse_mode === 'HTML'
  );
}
