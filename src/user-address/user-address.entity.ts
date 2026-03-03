import { Column, Entity, PrimaryColumn } from 'typeorm';
import { PolymarketProfile } from '../polymarket-api/polymarket-api.types';

@Entity({ name: 'user_address' })
export class UserAddress {
  @PrimaryColumn()
  address: string;

  @Column({ type: 'jsonb', nullable: true })
  profile: PolymarketProfile | null;
}
