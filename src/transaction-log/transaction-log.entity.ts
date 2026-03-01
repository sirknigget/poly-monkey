import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('transaction_log')
export class TransactionLog {
  @PrimaryColumn()
  transactionHash: string;

  @Column()
  activityTimestamp: Date;
}
