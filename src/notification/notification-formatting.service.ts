import { Injectable } from '@nestjs/common';
import { PolymarketActivity } from '../activity/activity.entity';
import { PolymarketProfile } from '../polymarket-api/polymarket-api.types';

@Injectable()
export class NotificationFormattingService {
  /**
   * Formats a PolymarketActivity into an HTML-formatted Telegram message.
   * Uses Telegram's supported HTML subset (bold, italic, anchor tags).
   * @param activity The activity to format.
   * @param profile  Optional Polymarket profile for the user; when a name is
   *                 present it is shown as "@name" next to the profile link.
   */
  format(
    activity: PolymarketActivity,
    profile?: PolymarketProfile | null,
  ): string {
    const link =
      activity.eventLink && activity.eventLink !== 'N/A'
        ? `🔗 <a href="${activity.eventLink}">View on Polymarket</a>`
        : `🔗 N/A`;

    const avgPriceLine = `📊 <b>Avg Price:</b> $${activity.avgPricePerToken.toFixed(4)}`;

    const uniquePrices = new Set(activity.orders.map((o) => o.tokenPrice));
    let priceSection: string;
    if (uniquePrices.size <= 1) {
      priceSection = avgPriceLine;
    } else {
      const levelMap = new Map<number, number>();
      for (const order of activity.orders) {
        levelMap.set(
          order.tokenPrice,
          (levelMap.get(order.tokenPrice) ?? 0) + order.numTokens,
        );
      }
      const breakdown = [...levelMap.entries()]
        .sort(([a], [b]) => a - b)
        .map(
          ([price, tokens]) => `$${price.toFixed(4)} × ${tokens.toFixed(2)}t`,
        )
        .join(' · ');
      priceSection = `${avgPriceLine}\n   ↳ ${breakdown}`;
    }

    const profileName = profile?.name
      ? ` @${profile.name}`
      : `User ${activity.userAddress}`;
    const profileLink = `👤 <a href="https://polymarket.com/${activity.userAddress}">${profileName}</a>`;

    return [
      `🎯 <b>${activity.eventTitle}</b>`,
      ``,
      `📅 <b>Date:</b> ${activity.timestamp.toLocaleString()}`,
      `💰 <b>Total (USD):</b> $${activity.totalPriceUsd.toFixed(2)}`,
      `🪙 <b>Tokens:</b> ${activity.numTokens.toFixed(2)}`,
      priceSection,
      `🏷️ <b>Outcome:</b> ${activity.outcomePurchased}`,
      `⬆️ <b>Side:</b> ${activity.side}`,
      `🔢 <b>Trades in group:</b> ${activity.activityCount}`,
      ``,
      link,
      profileLink,
    ].join('\n');
  }
}
