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
        ConfigModule.forRoot({ isGlobal: true }),
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
      await dao.add('0xabc123');

      const rows = await repository.find();
      expect(rows).toHaveLength(1);
      expect(rows[0].transactionHash).toBe('0xabc123');
    });
  });

  describe('existsByTransactionHash', () => {
    it('should return true when the transaction hash exists', async () => {
      await dao.add('0xexists');

      const result = await dao.existsByTransactionHash('0xexists');

      expect(result).toBe(true);
    });

    it('should return false when the transaction hash does not exist', async () => {
      const result = await dao.existsByTransactionHash('0xnotfound');

      expect(result).toBe(false);
    });
  });

  describe('deleteOlderThan', () => {
    it('should delete entries older than the cutoff and keep recent ones', async () => {
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
      await dao.add('0xfresh1');
      await dao.add('0xfresh2');

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      await dao.deleteOlderThan(24, oneHourAgo);

      const remaining = await repository.find();
      expect(remaining).toHaveLength(2);
    });
  });
});
