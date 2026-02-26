import { Test, TestingModule } from '@nestjs/testing';
import { TelegramService } from './telegram.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

async function buildService(): Promise<TelegramService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [TelegramService],
  }).compile();
  return module.get(TelegramService);
}

// ---------------------------------------------------------------------------
// Scenario 1 — Happy path: message sent to each chat ID
// ---------------------------------------------------------------------------
describe('TelegramService – Scenario 1: sends message to all configured chat IDs', () => {
  let service: TelegramService;
  const ORIGINAL_ENV = process.env;

  beforeAll(async () => {
    service = await buildService();
  });

  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      TELEGRAM_BOT_TOKEN: 'test-token',
      TELEGRAM_CHAT_IDS: '111,222,333',
    };
    mockedAxios.post.mockResolvedValue({ data: { ok: true } });
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.clearAllMocks();
  });

  it('calls axios.post once per chat ID with the correct URL', async () => {
    await service.sendMessage('hello');
    expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    const expectedUrl =
      'https://api.telegram.org/bottest-token/sendMessage';
    expect(mockedAxios.post).toHaveBeenCalledWith(expectedUrl, {
      chat_id: '111',
      text: 'hello',
      parse_mode: 'HTML',
    });
    expect(mockedAxios.post).toHaveBeenCalledWith(expectedUrl, {
      chat_id: '222',
      text: 'hello',
      parse_mode: 'HTML',
    });
    expect(mockedAxios.post).toHaveBeenCalledWith(expectedUrl, {
      chat_id: '333',
      text: 'hello',
      parse_mode: 'HTML',
    });
  });

  it('trims whitespace around chat IDs', async () => {
    process.env.TELEGRAM_CHAT_IDS = ' 444 , 555 ';
    await service.sendMessage('trimmed');
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ chat_id: '444' }),
    );
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ chat_id: '555' }),
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 2 — Missing TELEGRAM_BOT_TOKEN
// ---------------------------------------------------------------------------
describe('TelegramService – Scenario 2: throws when bot token is missing', () => {
  let service: TelegramService;
  const ORIGINAL_ENV = process.env;

  beforeAll(async () => {
    service = await buildService();
  });

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.TELEGRAM_BOT_TOKEN;
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.clearAllMocks();
  });

  it('rejects with a descriptive error message', async () => {
    await expect(service.sendMessage('test')).rejects.toThrow(
      'TELEGRAM_BOT_TOKEN is not set',
    );
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Scenario 3 — Empty TELEGRAM_CHAT_IDS: no HTTP calls made
// ---------------------------------------------------------------------------
describe('TelegramService – Scenario 3: no-op when chat IDs list is empty', () => {
  let service: TelegramService;
  const ORIGINAL_ENV = process.env;

  beforeAll(async () => {
    service = await buildService();
  });

  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      TELEGRAM_BOT_TOKEN: 'test-token',
      TELEGRAM_CHAT_IDS: '',
    };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.clearAllMocks();
  });

  it('does not call axios.post when chat IDs list is empty', async () => {
    await service.sendMessage('nobody home');
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Scenario 4 — axios error propagates
// ---------------------------------------------------------------------------
describe('TelegramService – Scenario 4: propagates axios errors', () => {
  let service: TelegramService;
  const ORIGINAL_ENV = process.env;

  beforeAll(async () => {
    service = await buildService();
  });

  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      TELEGRAM_BOT_TOKEN: 'test-token',
      TELEGRAM_CHAT_IDS: '999',
    };
    mockedAxios.post.mockRejectedValue(new Error('Network error'));
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
    jest.clearAllMocks();
  });

  it('rejects with the axios error', async () => {
    await expect(service.sendMessage('fails')).rejects.toThrow('Network error');
  });
});
