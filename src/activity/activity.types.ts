export interface Order {
  tokenPrice: number;
  numTokens: number;
  priceUsdt: number;
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
