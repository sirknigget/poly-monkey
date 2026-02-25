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
    // Implementation added in Task 02
    void axios;
    void userAddress;
    void limit;
    return [];
  }
}
