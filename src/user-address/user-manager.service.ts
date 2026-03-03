import { Injectable, Logger } from '@nestjs/common';
import { PolymarketApiService } from '../polymarket-api/polymarket-api.service';
import { UserAddressDao } from './user-address.dao';

@Injectable()
export class UserManagerService {
  constructor(
    private readonly userAddressDao: UserAddressDao,
    private readonly polymarketApiService: PolymarketApiService,
    private readonly logger: Logger,
  ) {}

  async add(userAddress: string): Promise<void> {
    const profile = await this.polymarketApiService.getProfile(userAddress);
    await this.userAddressDao.add(userAddress);
    await this.userAddressDao.updateProfile(userAddress, profile);
    this.logger.log(
      `Added user address ${userAddress} with profile name=${profile?.name ?? 'N/A'}`,
    );
  }

  async refreshAllProfiles(): Promise<void> {
    const users = await this.userAddressDao.findAll();
    this.logger.log(`Refreshing profiles for ${users.length} user(s)`);
    for (const user of users) {
      const profile = await this.polymarketApiService.getProfile(user.address);
      await this.userAddressDao.updateProfile(user.address, profile);
    }
  }
}
