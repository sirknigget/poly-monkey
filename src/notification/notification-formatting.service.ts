import { Injectable } from '@nestjs/common';
import { PolymarketActivity } from '../activity/activity.types';

@Injectable()
export class NotificationFormattingService {
  /**
   * Formats a PolymarketActivity into an HTML-formatted Telegram message.
   * Uses Telegram's supported HTML subset (bold, italic, anchor tags).
   */
  format(activity: PolymarketActivity): string {
    const link =
      activity.eventLink && activity.eventLink !== 'N/A'
        ? `🔗 <a href="${activity.eventLink}">View on Polymarket</a>`
        : `🔗 N/A`;

    return [
      `🎯 <b>${activity.eventTitle}</b>`,
      ``,
      `📅 <b>Date:</b> ${activity.date}`,
      `💰 <b>Total (USD):</b> $${activity.totalPriceUsd.toFixed(2)}`,
      `🪙 <b>Tokens:</b> ${activity.numTokens.toFixed(2)}`,
      `📊 <b>Avg Price:</b> $${activity.avgPricePerToken.toFixed(4)}`,
      `🏷️ <b>Outcome:</b> ${activity.outcomePurchased}`,
      `⬆️ <b>Side:</b> ${activity.side}`,
      `🔢 <b>Trades in group:</b> ${activity.activityCount}`,
      ``,
      link,
    ].join('\n');
  }
}
