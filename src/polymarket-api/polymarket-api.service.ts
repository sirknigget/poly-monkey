import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PolymarketProfile, RawActivity } from './polymarket-api.types';

@Injectable()
export class PolymarketApiService {
  constructor(
    private readonly httpService: HttpService,
    private readonly logger: Logger,
  ) {}

  async getActivities(
    userAddress: string,
    limit: number,
  ): Promise<RawActivity[]> {
    this.logger.log(`Fetching activities (limit=${limit})`);
    const response = await firstValueFrom(
      this.httpService.get<RawActivity[]>(
        'https://data-api.polymarket.com/activity',
        {
          params: {
            user: userAddress.toLowerCase(),
            limit,
            type: 'TRADE',
            sortBy: 'TIMESTAMP',
            sortDirection: 'DESC',
          },
        },
      ),
    );
    this.logger.log(`Received ${response.data.length} raw activities`);
    return response.data;
  }

  async getProfile(userAddress: string): Promise<PolymarketProfile | null> {
    this.logger.log(`Fetching profile for address ${userAddress}`);
    try {
      const response = await firstValueFrom(
        this.httpService.get<PolymarketProfile>(
          'https://gamma-api.polymarket.com/public-profile',
          { params: { address: userAddress } },
        ),
      );
      return response.data;
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (status === 404) {
        this.logger.log(`No profile found for address ${userAddress}`);
        return null;
      }
      throw error;
    }
  }
}
