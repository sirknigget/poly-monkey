import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('transaction_log')
export class TransactionLog {
  @PrimaryColumn()
  transactionHash: string;

  @CreateDateColumn()
  createdAt: Date;
}
