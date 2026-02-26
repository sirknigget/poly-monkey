import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RawActivity } from './polymarket-api.types';

@Injectable()
export class PolymarketApiService {
  constructor(private readonly httpService: HttpService) {}

  async getActivities(
    userAddress: string,
    limit: number,
  ): Promise<RawActivity[]> {
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
    return response.data;
  }
}
