import { Injectable } from '@nestjs/common';
import { PolymarketApiService } from '../polymarket-api/polymarket-api.service';
import { RawActivity } from '../polymarket-api/polymarket-api.types';
import { PolymarketActivity } from './activity.types';

type PartialActivity = Omit<PolymarketActivity, 'date'>;

interface Intermediate {
  partial: PartialActivity;
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

    const groups = this.groupByTransactionHash(rawActivities);
    const intermediates = this.buildIntermediates(groups);
    const merged = this.mergeIntermediates(intermediates);

    merged.sort((a, b) => b.timestamp - a.timestamp);

    return merged.map(({ partial, timestamp }) => ({
      ...partial,
      date: timestamp ? new Date(timestamp * 1000).toLocaleString() : 'N/A',
    }));
  }

  private mergeIntermediates(intermediates: Intermediate[]): Intermediate[] {
    const mergeMap = new Map<
      string,
      { partials: PartialActivity[]; timestamp: number }
    >();
    for (const { partial, timestamp } of intermediates) {
      const compositeKey = JSON.stringify([
        timestamp,
        partial.marketSlug,
        partial.outcomePurchased,
        partial.side,
      ]);
      const existing = mergeMap.get(compositeKey);
      if (existing) {
        existing.partials.push(partial);
      } else {
        mergeMap.set(compositeKey, { partials: [partial], timestamp });
      }
    }

    const merged: Intermediate[] = [];
    for (const { partials, timestamp } of mergeMap.values()) {
      if (partials.length === 1) {
        merged.push({ partial: partials[0], timestamp });
      } else {
        const first = partials[0];
        const mergedTotalPriceUsd = parseFloat(
          partials.reduce((sum, p) => sum + p.totalPriceUsd, 0).toFixed(2),
        );
        const mergedNumTokens = parseFloat(
          partials.reduce((sum, p) => sum + p.numTokens, 0).toFixed(2),
        );
        const mergedAvgPricePerToken = parseFloat(
          (mergedNumTokens === 0
            ? 0
            : mergedTotalPriceUsd / mergedNumTokens
          ).toFixed(4),
        );
        merged.push({
          partial: {
            transactionHash: first.transactionHash,
            eventTitle: first.eventTitle,
            eventLink: first.eventLink,
            marketSlug: first.marketSlug,
            outcomePurchased: first.outcomePurchased,
            side: first.side,
            totalPriceUsd: mergedTotalPriceUsd,
            numTokens: mergedNumTokens,
            avgPricePerToken: mergedAvgPricePerToken,
            activityCount: partials.reduce(
              (sum, p) => sum + p.activityCount,
              0,
            ),
          },
          timestamp,
        });
      }
    }
    return merged;
  }

  private groupByTransactionHash(
    rawActivities: RawActivity[],
  ): Map<string, RawActivity[]> {
    const groups = new Map<string, RawActivity[]>();
    for (const record of rawActivities) {
      const key = record.transactionHash ?? `unknown_${record.timestamp ?? 0}`;
      const existing = groups.get(key);
      if (existing) {
        existing.push(record);
      } else {
        groups.set(key, [record]);
      }
    }
    return groups;
  }

  private buildIntermediates(
    groups: Map<string, RawActivity[]>,
  ): Intermediate[] {
    const intermediates: Intermediate[] = [];
    for (const [key, records] of groups) {
      intermediates.push({
        partial: this.formatGroup(records, key),
        timestamp: records[0].timestamp ?? 0,
      });
    }
    return intermediates;
  }

  private formatGroup(records: RawActivity[], key: string): PartialActivity {
    const first = records[0];
    const totalUsdcSize = records.reduce(
      (sum, r) => sum + (r.usdcSize ?? 0),
      0,
    );
    const totalSize = records.reduce((sum, r) => sum + (r.size ?? 0), 0);

    const avgPricePerToken =
      records.length === 1
        ? parseFloat((first.price ?? 0).toFixed(4))
        : parseFloat(
            (totalSize === 0 ? 0 : totalUsdcSize / totalSize).toFixed(4),
          );

    return {
      transactionHash: key,
      eventTitle: first.title ?? 'Unknown Event',
      eventLink: first.eventSlug
        ? `https://polymarket.com/event/${first.eventSlug}`
        : 'N/A',
      marketSlug: first.slug ?? '',
      outcomePurchased: [...new Set(records.map((r) => r.outcome ?? 'Unknown'))]
        .sort()
        .join(', '),
      side: first.side ?? 'N/A',
      totalPriceUsd: parseFloat(totalUsdcSize.toFixed(2)),
      numTokens: parseFloat(totalSize.toFixed(2)),
      avgPricePerToken,
      activityCount: records.length,
    };
  }
}
