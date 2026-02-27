import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionLog } from './transaction-log.entity';
import { TransactionLogDao } from './transaction-log.dao';

@Module({
  imports: [TypeOrmModule.forFeature([TransactionLog])],
  providers: [TransactionLogDao],
  exports: [TransactionLogDao],
})
export class TransactionLogModule {}
