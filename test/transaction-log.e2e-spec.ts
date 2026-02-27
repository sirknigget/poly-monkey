import * as path from 'path';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { typeOrmConfig } from '../src/config/database.config';
import { TransactionLogModule } from '../src/transaction-log/transaction-log.module';
import { TransactionLogDao } from '../src/transaction-log/transaction-log.dao';
import { TransactionLog } from '../src/transaction-log/transaction-log.entity';

describe('TransactionLogDao Integration', () => {
  let moduleFixture: TestingModule;
  let dao: TransactionLogDao;
  let repository: Repository<TransactionLog>;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: path.resolve(__dirname, '../.env'),
        }),
        TypeOrmModule.forRootAsync(typeOrmConfig),
        TransactionLogModule,
      ],
    }).compile();

    dao = moduleFixture.get<TransactionLogDao>(TransactionLogDao);
    repository = moduleFixture.get<Repository<TransactionLog>>(
      getRepositoryToken(TransactionLog),
    );
  });

  afterAll(async () => {
    await moduleFixture.close();
  });

  beforeEach(async () => {
    await repository.clear();
  });

  describe('add', () => {
    it('should persist a transaction hash to the database', async () => {
      // AC: add(transactionHash) creates a row in transaction_log
      // Behavior: call add() → INSERT row → row visible in DB
      // @category: core-functionality
      // @dependency: TransactionLogDao, PostgreSQL
      // @complexity: low
      // ROI: high
      await dao.add('0xabc123');

      const rows = await repository.find();
      expect(rows).toHaveLength(1);
      expect(rows[0].transactionHash).toBe('0xabc123');
    });
  });

  describe('existsByTransactionHash', () => {
    it('should return true when the transaction hash exists', async () => {
      // AC: existsByTransactionHash returns true for a hash that was previously added
      // Behavior: add hash → existsByTransactionHash(hash) → true
      // @category: core-functionality
      // @dependency: TransactionLogDao, PostgreSQL
      // @complexity: low
      // ROI: high
      await dao.add('0xexists');

      const result = await dao.existsByTransactionHash('0xexists');

      expect(result).toBe(true);
    });

    it('should return false when the transaction hash does not exist', async () => {
      // AC: existsByTransactionHash returns false for an unknown hash
      // Behavior: empty DB → existsByTransactionHash(unknown) → false
      // @category: core-functionality
      // @dependency: TransactionLogDao, PostgreSQL
      // @complexity: low
      // ROI: high
      const result = await dao.existsByTransactionHash('0xnotfound');

      expect(result).toBe(false);
    });
  });

  describe('deleteOlderThan', () => {
    it('should delete entries older than the cutoff and keep recent ones', async () => {
      // AC: deleteOlderThan(hours, now) removes entries with createdAt < (now - hours)
      // Behavior: insert old + new rows → deleteOlderThan(1, now) → only new row remains
      // @category: core-functionality
      // @dependency: TransactionLogDao, PostgreSQL
      // @complexity: medium
      // ROI: high
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

      await repository.save({
        transactionHash: '0xold',
        createdAt: twoHoursAgo,
      });
      await repository.save({
        transactionHash: '0xnew',
        createdAt: oneMinuteAgo,
      });

      await dao.deleteOlderThan(1, now);

      const remaining = await repository.find();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].transactionHash).toBe('0xnew');
    });

    it('should delete all entries when all are older than the cutoff', async () => {
      // AC: deleteOlderThan removes all entries when all predate the cutoff
      // Behavior: insert 2 old rows → deleteOlderThan(1, now) → empty table
      // @category: edge-case
      // @dependency: TransactionLogDao, PostgreSQL
      // @complexity: low
      // ROI: medium
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      await repository.save([
        { transactionHash: '0xold1', createdAt: twoHoursAgo },
        { transactionHash: '0xold2', createdAt: twoHoursAgo },
      ]);

      await dao.deleteOlderThan(1, now);

      const remaining = await repository.find();
      expect(remaining).toHaveLength(0);
    });

    it('should keep all entries when none are older than the cutoff', async () => {
      // AC: deleteOlderThan keeps entries newer than the cutoff
      // Behavior: insert 2 fresh rows → deleteOlderThan(24, oneHourAgo) → both rows remain
      // @category: edge-case
      // @dependency: TransactionLogDao, PostgreSQL
      // @complexity: low
      // ROI: medium
      await dao.add('0xfresh1');
      await dao.add('0xfresh2');

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      await dao.deleteOlderThan(24, oneHourAgo);

      const remaining = await repository.find();
      expect(remaining).toHaveLength(2);
    });
  });
});
