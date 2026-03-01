import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { PolymarketActivity } from './activity.entity';

@Injectable()
export class ActivityDao {
  constructor(
    @InjectRepository(PolymarketActivity)
    private readonly repository: Repository<PolymarketActivity>,
  ) {}

  async add(activity: PolymarketActivity): Promise<void> {
    await this.repository.save(activity);
  }

  async deleteOlderThan(cutoff: Date): Promise<void> {
    await this.repository.delete({ timestamp: LessThan(cutoff) });
  }
}
