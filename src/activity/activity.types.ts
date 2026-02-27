export interface Order {
  tokenPrice: number; // source: RawActivity.price ?? 0
  numTokens: number; // source: RawActivity.size ?? 0
  priceUsdt: number; // source: RawActivity.usdcSize ?? 0
}

export interface PolymarketActivity {
  transactionHashes: string[];
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
  orders: Order[];
}
