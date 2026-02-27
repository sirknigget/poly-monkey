/**
 * Activity Research Script
 *
 * Fetches raw Polymarket activities, saves them for inspection, then applies
 * groupByTransactionHash + buildIntermediates and saves that output too.
 *
 * Run with:
 *   npx ts-node test/activity-research.ts
 *
 * Outputs:
 *   test/research-out/raw-activities.json
 *   test/research-out/intermediates.json
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const TEST_ADDRESS = '0x2005d16a84ceefa912d4e380cd32e7ff827875ea';
const LIMIT = 1000;

// ---- types (mirrors polymarket-api.types.ts) ----

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

// ---- logic replicated from activity.service.ts ----

function groupByTransactionHash(
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

interface Intermediate {
  transactionHash: string;
  timestamp: number;
  marketSlug: string;
  outcomePurchased: string;
  side: string;
  totalPriceUsd: number;
  numTokens: number;
  avgPricePerToken: number;
  activityCount: number;
  eventTitle: string;
  // keep raw records for inspection
  _rawRecords: RawActivity[];
}

function buildIntermediates(
  groups: Map<string, RawActivity[]>,
): Intermediate[] {
  const intermediates: Intermediate[] = [];
  for (const [key, records] of groups) {
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

    intermediates.push({
      transactionHash: key,
      timestamp: first.timestamp ?? 0,
      marketSlug: first.slug ?? '',
      outcomePurchased: [...new Set(records.map((r) => r.outcome ?? 'Unknown'))]
        .sort()
        .join(', '),
      side: first.side ?? 'N/A',
      totalPriceUsd: parseFloat(totalUsdcSize.toFixed(2)),
      numTokens: parseFloat(totalSize.toFixed(2)),
      avgPricePerToken,
      activityCount: records.length,
      eventTitle: first.title ?? 'Unknown Event',
      _rawRecords: records,
    });
  }
  return intermediates;
}

// ---- secondary merge analysis ----

interface MergeGroup {
  compositeKey: string;
  count: number;
  items: Intermediate[];
}

function findSecondaryMergeCandidates(
  intermediates: Intermediate[],
): MergeGroup[] {
  const map = new Map<string, Intermediate[]>();
  for (const item of intermediates) {
    const key = JSON.stringify([
      item.timestamp,
      item.marketSlug,
      item.outcomePurchased,
      item.side,
    ]);
    const existing = map.get(key);
    if (existing) {
      existing.push(item);
    } else {
      map.set(key, [item]);
    }
  }
  return [...map.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([compositeKey, items]) => ({
      compositeKey,
      count: items.length,
      items,
    }));
}

// ---- main ----

async function main() {
  const outDir = path.join(__dirname, 'research-out');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log(`Fetching ${LIMIT} activities for ${TEST_ADDRESS}...`);
  const response = await axios.get<RawActivity[]>(
    'https://data-api.polymarket.com/activity',
    {
      params: {
        user: TEST_ADDRESS.toLowerCase(),
        limit: LIMIT,
        type: 'TRADE',
        sortBy: 'TIMESTAMP',
        sortDirection: 'DESC',
      },
    },
  );

  const rawActivities: RawActivity[] = response.data;
  console.log(`Received ${rawActivities.length} raw records.`);

  const rawPath = path.join(outDir, 'raw-activities.json');
  fs.writeFileSync(rawPath, JSON.stringify(rawActivities, null, 2));
  console.log(`Saved: ${rawPath}`);

  const groups = groupByTransactionHash(rawActivities);
  const intermediates = buildIntermediates(groups);

  const intermediatesPath = path.join(outDir, 'intermediates.json');
  fs.writeFileSync(intermediatesPath, JSON.stringify(intermediates, null, 2));
  console.log(`Saved: ${intermediatesPath}`);

  // ---- report ----

  console.log('\n======= ANALYSIS =======');
  console.log(`Raw records            : ${rawActivities.length}`);
  console.log(`Unique tx hashes       : ${groups.size}`);

  const multiRecordGroups = [...groups.values()].filter(
    (recs) => recs.length > 1,
  );
  console.log(
    `Tx hashes with >1 record : ${multiRecordGroups.length}` +
      (multiRecordGroups.length > 0
        ? ` (max ${Math.max(...multiRecordGroups.map((g) => g.length))} records in one group)`
        : ''),
  );

  const mergeCandidates = findSecondaryMergeCandidates(intermediates);
  console.log(
    `\nSecondary merge candidates (same [timestamp, slug, outcome, side]): ${mergeCandidates.length}`,
  );

  if (mergeCandidates.length > 0) {
    console.log('\nTop candidates:');
    mergeCandidates.slice(0, 10).forEach(({ compositeKey, count, items }) => {
      const parsed = JSON.parse(compositeKey) as [
        number,
        string,
        string,
        string,
      ];
      const [ts, slug, outcome, side] = parsed;
      const date = new Date(ts * 1000).toISOString();
      const totalUsd = items.reduce((s, i) => s + i.totalPriceUsd, 0);
      console.log(
        `  [${date}] ${slug} | ${outcome} | ${side} — ${count} txns, combined $${totalUsd.toFixed(2)}`,
      );
    });
  } else {
    console.log('\nNo secondary merge candidates found in this sample.');
    console.log(
      'The mergeIntermediates step appears to have no effect on this data.',
    );
  }

  // Distribution of activityCount (records per tx)
  const countDist = new Map<number, number>();
  for (const item of intermediates) {
    countDist.set(
      item.activityCount,
      (countDist.get(item.activityCount) ?? 0) + 1,
    );
  }
  console.log('\nRecords-per-tx distribution:');
  [...countDist.entries()]
    .sort(([a], [b]) => a - b)
    .forEach(([count, freq]) => {
      console.log(`  ${count} record(s) per tx: ${freq} transactions`);
    });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
