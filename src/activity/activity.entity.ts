import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export interface Order {
  tokenPrice: number;
  numTokens: number;
  priceUsdt: number;
}

@Index(['timestamp', 'marketSlug', 'outcomePurchased', 'side', 'userAddress'])
@Entity()
export class PolymarketActivity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ type: 'text', array: true })
  transactionHashes: string[];

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column()
  userAddress: string;

  @Column()
  eventTitle: string;

  @Column()
  eventLink: string;

  @Column()
  marketSlug: string;

  @Column()
  outcomePurchased: string;

  @Column()
  side: string;

  @Column({ type: 'float' })
  totalPriceUsd: number;

  @Column({ type: 'float' })
  numTokens: number;

  @Column({ type: 'float' })
  avgPricePerToken: number;

  @Column()
  activityCount: number;

  @Column({ type: 'jsonb' })
  orders: Order[];
}
