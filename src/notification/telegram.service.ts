import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * Sends Telegram messages to a static list of chat IDs via the Bot API.
 *
 * Required environment variables:
 *   TELEGRAM_BOT_TOKEN  – the token from @BotFather (e.g. "123456:ABC-DEF...")
 *   TELEGRAM_CHAT_IDS   – comma-separated list of chat IDs to broadcast to
 *                         (e.g. "111111111,222222222")
 *
 * How to obtain a chat ID:
 *   Anyone can get their own chat ID instantly by messaging @userinfobot on Telegram.
 *   It replies immediately with their numeric ID — no API calls needed.
 */
@Injectable()
export class TelegramService {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {}

  /**
   * Broadcasts an HTML-formatted message to every configured chat ID.
   * Throws if TELEGRAM_BOT_TOKEN is not set.
   */
  async sendMessage(text: string): Promise<void> {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      throw new Error(
        'TELEGRAM_BOT_TOKEN is not set. Please configure it as an environment variable.',
      );
    }

    const rawIds = this.configService.get<string>('TELEGRAM_CHAT_IDS') ?? '';
    const chatIds = rawIds
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (chatIds.length === 0) {
      this.logger.warn(
        'TELEGRAM_CHAT_IDS is empty — no messages will be sent.',
      );
      return;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    this.logger.log(`Sending notification to ${chatIds.length} chat(s)`);
    await Promise.all(
      chatIds.map((chatId) =>
        axios.post(url, {
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        }),
      ),
    );
  }
}
