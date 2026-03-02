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
    fromTime: number,
  ): Promise<PolymarketActivity[]> {
    const rawActivities = await this.polymarketApiService.getActivities(
      userAddress,
      limit,
    );

    const now = Date.now();
    const latestRaw = rawActivities.reduce(
      (max, r) => (r.timestamp > max ? r.timestamp : max),
      0,
    );
    this.logger.debug(
      `[date-debug] Date.now() UTC: ${new Date(now).toISOString()}, local: ${new Date(now).toString()}`,
    );
    this.logger.debug(
      `[date-debug] Latest raw activity timestamp: ${latestRaw} → ${new Date(latestRaw * 1000).toISOString()} (raw count: ${rawActivities.length})`,
    );
    this.logger.debug(
      `[date-debug] fromTime param: ${fromTime} → ${new Date(fromTime).toISOString()}, threshold (fromTime/1000): ${fromTime / 1000}`,
    );

    const filtered = rawActivities.filter(
      (r) => r.timestamp >= fromTime / 1000,
    );
    const groups = this.groupByCompositeKey(filtered);

    const activities = [...groups.values()]
      .map(({ records, timestamp }) => ({
        activity: this.buildActivity(records, timestamp, userAddress),
        timestamp,
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((e) => e.activity);

    this.logger.log(
      `Aggregated ${filtered.length} raw records into ${activities.length} activities`,
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
    userAddress: string,
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
      userAddress,
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
