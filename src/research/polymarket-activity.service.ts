import { Injectable } from '@nestjs/common';
import axios from 'axios';

/** Shape of a single record returned by the Polymarket Data API */
interface RawActivity {
  transactionHash?: string;
  timestamp?: number;
  title?: string;
  eventSlug?: string;
  slug?: string;
  outcome?: string;
  side?: string;
  usdcSize?: number;
  size?: number;
  price?: number;
}

/** Aggregated, formatted activity returned by PolymarketActivityService */
export interface PolymarketActivity {
  transactionHash: string;
  date: string;
  eventTitle: string;
  eventLink: string;
  marketSlug: string;
  outcomePurchased: string;
  side: string;
  totalPriceUsd: number;
  numTokens: number;
  avgPricePerToken: number;
  activityCount: number;
}

@Injectable()
export class PolymarketActivityService {
  async fetchActivities(
    userAddress: string,
    limit = 100,
  ): Promise<PolymarketActivity[]> {
    const response = await axios.get<RawActivity[]>(
      'https://data-api.polymarket.com/activity',
      {
        params: {
          user: userAddress.toLowerCase(),
          limit,
          type: 'TRADE',
          sortBy: 'TIMESTAMP',
          sortDirection: 'DESC',
        },
      },
    );

    const rawActivities = response.data;

    // Group raw records by transactionHash
    const groups = new Map<string, RawActivity[]>();
    for (const record of rawActivities) {
      const key =
        record.transactionHash ?? `unknown_${record.timestamp ?? 0}`;
      const existing = groups.get(key);
      if (existing) {
        existing.push(record);
      } else {
        groups.set(key, [record]);
      }
    }

    // Format each group into a PolymarketActivity
    const activities: Array<{ activity: PolymarketActivity; timestamp: number }> =
      [];

    for (const [key, records] of groups) {
      if (records.length === 1) {
        activities.push({
          activity: this.formatSingle(records[0], key),
          timestamp: records[0].timestamp ?? 0,
        });
      } else {
        activities.push({
          activity: this.aggregateGroup(records, key),
          timestamp: records[0].timestamp ?? 0,
        });
      }
    }

    // Sort by timestamp descending; missing timestamp treated as 0
    activities.sort((a, b) => b.timestamp - a.timestamp);

    return activities.map((entry) => entry.activity);
  }

  private formatSingle(record: RawActivity, key: string): PolymarketActivity {
    return {
      transactionHash: key,
      date: record.timestamp
        ? new Date(record.timestamp * 1000).toLocaleString()
        : 'N/A',
      eventTitle: record.title ?? 'Unknown Event',
      eventLink: record.eventSlug
        ? `https://polymarket.com/event/${record.eventSlug}`
        : 'N/A',
      marketSlug: record.slug ?? '',
      outcomePurchased: record.outcome ?? 'Unknown',
      side: record.side ?? 'N/A',
      totalPriceUsd: parseFloat((record.usdcSize ?? 0).toFixed(2)),
      numTokens: parseFloat((record.size ?? 0).toFixed(2)),
      avgPricePerToken: parseFloat((record.price ?? 0).toFixed(4)),
      activityCount: 1,
    };
  }

  private aggregateGroup(
    records: RawActivity[],
    key: string,
  ): PolymarketActivity {
    const first = records[0];

    const totalUsdcSize = records.reduce(
      (sum, r) => sum + (r.usdcSize ?? 0),
      0,
    );
    const totalSize = records.reduce((sum, r) => sum + (r.size ?? 0), 0);
    const avgPrice = totalSize === 0 ? 0 : totalUsdcSize / totalSize;

    const uniqueOutcomes = [
      ...new Set(records.map((r) => r.outcome ?? 'Unknown')),
    ].sort();

    return {
      transactionHash: key,
      date: first.timestamp
        ? new Date(first.timestamp * 1000).toLocaleString()
        : 'N/A',
      eventTitle: first.title ?? 'Unknown Event',
      eventLink: first.eventSlug
        ? `https://polymarket.com/event/${first.eventSlug}`
        : 'N/A',
      marketSlug: first.slug ?? '',
      outcomePurchased: uniqueOutcomes.join(', '),
      side: first.side ?? 'N/A',
      totalPriceUsd: parseFloat(totalUsdcSize.toFixed(2)),
      numTokens: parseFloat(totalSize.toFixed(2)),
      avgPricePerToken: parseFloat(avgPrice.toFixed(4)),
      activityCount: records.length,
    };
  }
}
