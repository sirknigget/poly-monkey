import { Injectable, Logger } from '@nestjs/common';
import { PolymarketApiService } from '../polymarket-api/polymarket-api.service';
import { RawActivity } from '../polymarket-api/polymarket-api.types';
import { Order, PolymarketActivity } from './activity.entity';

interface ActivityGroup {
  records: RawActivity[];
  timestamp: number;
}

@Injectable()
export class ActivityService {
  constructor(
    private readonly polymarketApiService: PolymarketApiService,
    private readonly logger: Logger,
  ) {}

  async fetchActivities(
    userAddress: string,
    limit: number,
  ): Promise<PolymarketActivity[]> {
    const rawActivities = await this.polymarketApiService.getActivities(
      userAddress,
      limit,
    );

    const groups = this.groupByCompositeKey(rawActivities);

    const activities = [...groups.values()]
      .map(({ records, timestamp }) => ({
        activity: this.buildActivity(records, timestamp),
        timestamp,
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((e) => e.activity);

    this.logger.log(
      `Aggregated ${rawActivities.length} raw records into ${activities.length} activities`,
    );

    return activities;
  }

  private groupByCompositeKey(
    rawActivities: RawActivity[],
  ): Map<string, ActivityGroup> {
    const groups = new Map<string, ActivityGroup>();
    for (const record of rawActivities) {
      const key = JSON.stringify([
        record.timestamp,
        record.slug,
        record.outcome,
        record.side,
      ]);
      const existing = groups.get(key);
      if (existing) {
        existing.records.push(record);
      } else {
        groups.set(key, {
          records: [record],
          timestamp: record.timestamp,
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
      records.reduce((sum, r) => sum + r.usdcSize, 0).toFixed(2),
    );
    const numTokens = parseFloat(
      records.reduce((sum, r) => sum + r.size, 0).toFixed(2),
    );
    const avgPricePerToken = parseFloat(
      (numTokens === 0 ? 0 : totalPriceUsd / numTokens).toFixed(4),
    );
    const orders: Order[] = records.map((r) => ({
      tokenPrice: r.price,
      numTokens: r.size,
      priceUsdt: r.usdcSize,
    }));
    const transactionHashes = records
      .map((r) => r.transactionHash)
      .filter((h): h is string => h !== undefined);

    return {
      transactionHashes,
      timestamp: new Date(timestamp * 1000),
      eventTitle: first.title,
      eventLink: `https://polymarket.com/event/${first.eventSlug}`,
      marketSlug: first.slug,
      outcomePurchased: first.outcome,
      side: first.side,
      totalPriceUsd,
      numTokens,
      avgPricePerToken,
      activityCount: records.length,
      orders,
    };
  }
}
