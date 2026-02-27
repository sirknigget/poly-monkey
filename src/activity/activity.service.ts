import { Injectable } from '@nestjs/common';
import { PolymarketApiService } from '../polymarket-api/polymarket-api.service';
import { RawActivity } from '../polymarket-api/polymarket-api.types';
import { Order, PolymarketActivity } from './activity.types';

interface ActivityGroup {
  records: RawActivity[];
  timestamp: number;
}

@Injectable()
export class ActivityService {
  constructor(private readonly polymarketApiService: PolymarketApiService) {}

  async fetchActivities(
    userAddress: string,
    limit: number,
  ): Promise<PolymarketActivity[]> {
    const rawActivities = await this.polymarketApiService.getActivities(
      userAddress,
      limit,
    );

    const groups = this.groupByCompositeKey(rawActivities);

    return [...groups.values()]
      .map(({ records, timestamp }) => ({
        activity: this.buildActivity(records, timestamp),
        timestamp,
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((e) => e.activity);
  }

  private groupByCompositeKey(
    rawActivities: RawActivity[],
  ): Map<string, ActivityGroup> {
    const groups = new Map<string, ActivityGroup>();
    for (const record of rawActivities) {
      const key = JSON.stringify([
        record.timestamp ?? 0,
        record.slug ?? '',
        record.outcome ?? 'Unknown',
        record.side ?? 'N/A',
      ]);
      const existing = groups.get(key);
      if (existing) {
        existing.records.push(record);
      } else {
        groups.set(key, {
          records: [record],
          timestamp: record.timestamp ?? 0,
        });
      }
    }
    return groups;
  }

  private buildActivity(
    records: RawActivity[],
    timestamp: number,
  ): PolymarketActivity {
    const first = records[0];
    const totalPriceUsd = parseFloat(
      records.reduce((sum, r) => sum + (r.usdcSize ?? 0), 0).toFixed(2),
    );
    const numTokens = parseFloat(
      records.reduce((sum, r) => sum + (r.size ?? 0), 0).toFixed(2),
    );
    const avgPricePerToken = parseFloat(
      (numTokens === 0 ? 0 : totalPriceUsd / numTokens).toFixed(4),
    );
    const orders: Order[] = records.map((r) => ({
      tokenPrice: r.price ?? 0,
      numTokens: r.size ?? 0,
      priceUsdt: r.usdcSize ?? 0,
    }));
    const transactionHashes = records
      .map((r) => r.transactionHash)
      .filter((h): h is string => h !== undefined);

    return {
      transactionHashes,
      date: timestamp ? new Date(timestamp * 1000).toLocaleString() : 'N/A',
      eventTitle: first.title ?? 'Unknown Event',
      eventLink: first.eventSlug
        ? `https://polymarket.com/event/${first.eventSlug}`
        : 'N/A',
      marketSlug: first.slug ?? '',
      outcomePurchased: first.outcome ?? 'Unknown',
      side: first.side ?? 'N/A',
      totalPriceUsd,
      numTokens,
      avgPricePerToken,
      activityCount: records.length,
      orders,
    };
  }
}
