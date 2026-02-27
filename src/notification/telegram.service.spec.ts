import { TestBed, Mocked } from '@suites/unit';
import { ConfigService } from '@nestjs/config';
import { TelegramService } from './telegram.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

let service: TelegramService;
let configService: Mocked<ConfigService>;

beforeAll(async () => {
  const { unit, unitRef } = await TestBed.solitary(TelegramService).compile();
  service = unit;
  configService = unitRef.get(ConfigService);
});

afterEach(() => {
  jest.clearAllMocks();
});

function mockConfig(token: string | undefined, chatIds: string): void {
  configService.get.mockImplementation((key: string) => {
    if (key === 'TELEGRAM_BOT_TOKEN') return token;
    if (key === 'TELEGRAM_CHAT_IDS') return chatIds;
    return undefined;
  });
}

// ---------------------------------------------------------------------------
// Scenario 1 — Happy path: message sent to each chat ID
// ---------------------------------------------------------------------------
describe('TelegramService – Scenario 1: sends message to all configured chat IDs', () => {
  beforeEach(() => {
    mockConfig('test-token', '111,222,333');
    mockedAxios.post.mockResolvedValue({ data: { ok: true } });
  });

  it('calls axios.post once per chat ID with the correct URL', async () => {
    await service.sendMessage('hello');
    expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    const expectedUrl = 'https://api.telegram.org/bottest-token/sendMessage';
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
    mockConfig('test-token', ' 444 , 555 ');
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
  beforeEach(() => {
    mockConfig(undefined, '');
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
  beforeEach(() => {
    mockConfig('test-token', '');
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
  beforeEach(() => {
    mockConfig('test-token', '999');
    mockedAxios.post.mockRejectedValue(new Error('Network error'));
  });

  it('rejects with the axios error', async () => {
    await expect(service.sendMessage('fails')).rejects.toThrow('Network error');
  });
});
