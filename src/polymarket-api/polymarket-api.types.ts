/** Shape of the public profile returned by gamma-api.polymarket.com */
export interface PolymarketProfile {
  name?: string | null;
  pseudonym?: string | null;
  bio?: string | null;
  profileImage?: string | null;
  xUsername?: string | null;
  verifiedBadge?: boolean | null;
  displayUsernamePublic?: boolean | null;
  proxyWallet?: string | null;
  createdAt?: string | null;
}

/** Shape of a single record returned by the Polymarket Data API */
export interface RawActivity {
  transactionHash?: string;
  timestamp: number;
  title: string;
  eventSlug: string;
  slug: string;
  outcome: string;
  side: string;
  usdcSize: number;
  size: number;
  price: number;
}
