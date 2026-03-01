import { Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'user_address' })
export class UserAddress {
  @PrimaryColumn()
  address: string;
}
