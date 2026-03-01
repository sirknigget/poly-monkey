import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { typeOrmConfig } from '../src/database/database.config';
import { UserAddressModule } from '../src/user-address/user-address.module';
import { UserAddressDao } from '../src/user-address/user-address.dao';
import { UserAddress } from '../src/user-address/user-address.entity';

describe('UserAddressDao Integration', () => {
  let moduleFixture: TestingModule;
  let dao: UserAddressDao;
  let repository: Repository<UserAddress>;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync(typeOrmConfig),
        UserAddressModule,
      ],
    }).compile();

    dao = moduleFixture.get<UserAddressDao>(UserAddressDao);
    repository = moduleFixture.get<Repository<UserAddress>>(
      getRepositoryToken(UserAddress),
    );
  });

  afterAll(async () => {
    await moduleFixture.close();
  });

  beforeEach(async () => {
    await repository.clear();
  });

  describe('add', () => {
    it('persists a new address', async () => {
      await dao.add('0xABC');

      const rows = await repository.find();
      expect(rows).toHaveLength(1);
      expect(rows[0].address).toBe('0xABC');
    });

    it('adding the same address twice does not create a duplicate', async () => {
      await dao.add('0xABC');
      await dao.add('0xABC');

      const rows = await repository.find();
      expect(rows).toHaveLength(1);
    });
  });

  describe('delete', () => {
    it('removes an existing address', async () => {
      await dao.add('0xABC');
      await dao.delete('0xABC');

      const rows = await repository.find();
      expect(rows).toHaveLength(0);
    });

    it('deleting a non-existent address does not throw', async () => {
      await expect(dao.delete('0xNONEXISTENT')).resolves.not.toThrow();
    });
  });

  describe('findAll', () => {
    it('returns empty array when no addresses exist', async () => {
      const result = await dao.findAll();

      expect(result).toEqual([]);
    });

    it('returns all stored addresses', async () => {
      await dao.add('0xABC');
      await dao.add('0xDEF');

      const result = await dao.findAll();

      expect(result).toHaveLength(2);
      expect(result).toContain('0xABC');
      expect(result).toContain('0xDEF');
    });

    it('does not return a deleted address', async () => {
      await dao.add('0xABC');
      await dao.add('0xDEF');
      await dao.delete('0xABC');

      const result = await dao.findAll();

      expect(result).toEqual(['0xDEF']);
    });
  });
});
