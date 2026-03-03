import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PolymarketProfile } from '../polymarket-api/polymarket-api.types';
import { UserAddress } from './user-address.entity';

@Injectable()
export class UserAddressDao {
  constructor(
    @InjectRepository(UserAddress)
    private readonly repository: Repository<UserAddress>,
  ) {}

  async add(address: string): Promise<void> {
    await this.repository.save({ address, profile: null });
  }

  async delete(address: string): Promise<void> {
    await this.repository.delete({ address });
  }

  async findAll(): Promise<UserAddress[]> {
    return this.repository.find();
  }

  async updateProfile(
    address: string,
    profile: PolymarketProfile | null,
  ): Promise<void> {
    await this.repository.update({ address }, { profile });
  }
}
