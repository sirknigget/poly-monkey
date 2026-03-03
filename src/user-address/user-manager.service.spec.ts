import { TestBed, Mocked } from '@suites/unit';
import { UserManagerService } from './user-manager.service';
import { UserAddressDao } from './user-address.dao';
import { PolymarketApiService } from '../polymarket-api/polymarket-api.service';
import { UserAddress } from './user-address.entity';

const makeUser = (overrides: Partial<UserAddress> = {}): UserAddress => ({
  address: '0xABC',
  profile: null,
  ...overrides,
});

describe('UserManagerService', () => {
  let service: UserManagerService;
  let mockDao: Mocked<UserAddressDao>;
  let mockApiService: Mocked<PolymarketApiService>;

  beforeAll(async () => {
    const { unit, unitRef } =
      await TestBed.solitary(UserManagerService).compile();
    service = unit;
    mockDao = unitRef.get(UserAddressDao);
    mockApiService = unitRef.get(PolymarketApiService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockDao.add.mockResolvedValue(undefined);
    mockDao.updateProfile.mockResolvedValue(undefined);
    mockDao.findAll.mockResolvedValue([]);
    mockApiService.getProfile.mockResolvedValue(null);
  });

  describe('add', () => {
    it('fetches the profile, persists the address, and stores the profile', async () => {
      const profile = { name: 'Alice' };
      mockApiService.getProfile.mockResolvedValue(profile);

      await service.add('0xABC');

      expect(mockApiService.getProfile).toHaveBeenCalledWith('0xABC');
      expect(mockDao.add).toHaveBeenCalledWith('0xABC');
      expect(mockDao.updateProfile).toHaveBeenCalledWith('0xABC', profile);
    });

    it('stores null profile when getProfile returns null', async () => {
      mockApiService.getProfile.mockResolvedValue(null);

      await service.add('0xABC');

      expect(mockDao.updateProfile).toHaveBeenCalledWith('0xABC', null);
    });
  });

  describe('refreshAllProfiles', () => {
    it('updates profile for each stored user address', async () => {
      mockDao.findAll.mockResolvedValue([
        makeUser({ address: '0xAAA' }),
        makeUser({ address: '0xBBB' }),
      ]);
      mockApiService.getProfile
        .mockResolvedValueOnce({ name: 'Alice' })
        .mockResolvedValueOnce({ name: 'Bob' });

      await service.refreshAllProfiles();

      expect(mockApiService.getProfile).toHaveBeenCalledTimes(2);
      expect(mockDao.updateProfile).toHaveBeenCalledWith('0xAAA', {
        name: 'Alice',
      });
      expect(mockDao.updateProfile).toHaveBeenCalledWith('0xBBB', {
        name: 'Bob',
      });
    });

    it('does nothing when there are no users', async () => {
      mockDao.findAll.mockResolvedValue([]);

      await service.refreshAllProfiles();

      expect(mockApiService.getProfile).not.toHaveBeenCalled();
      expect(mockDao.updateProfile).not.toHaveBeenCalled();
    });

    it('stores null profile when getProfile returns null for a user', async () => {
      mockDao.findAll.mockResolvedValue([makeUser({ address: '0xABC' })]);
      mockApiService.getProfile.mockResolvedValue(null);

      await service.refreshAllProfiles();

      expect(mockDao.updateProfile).toHaveBeenCalledWith('0xABC', null);
    });
  });
});
