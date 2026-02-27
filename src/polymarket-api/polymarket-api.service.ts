import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RawActivity } from './polymarket-api.types';

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
}
