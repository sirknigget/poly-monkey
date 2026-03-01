import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { TransactionLog } from './transaction-log.entity';

@Injectable()
export class TransactionLogDao {
  constructor(
    @InjectRepository(TransactionLog)
    private readonly repository: Repository<TransactionLog>,
  ) {}

  async add(transactionHash: string, activityTimestamp: Date): Promise<void> {
    await this.repository.save({ transactionHash, activityTimestamp });
  }

  async existsByTransactionHash(transactionHash: string): Promise<boolean> {
    const count = await this.repository.countBy({ transactionHash });
    return count > 0;
  }

  async deleteOlderThan(hours: number, now: Date = new Date()): Promise<void> {
    const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);
    await this.repository.delete({ activityTimestamp: LessThan(cutoff) });
  }
}
