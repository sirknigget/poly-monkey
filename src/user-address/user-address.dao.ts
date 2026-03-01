import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserAddress } from './user-address.entity';

@Injectable()
export class UserAddressDao {
  constructor(
    @InjectRepository(UserAddress)
    private readonly repository: Repository<UserAddress>,
  ) {}

  async add(address: string): Promise<void> {
    await this.repository.save({ address });
  }

  async delete(address: string): Promise<void> {
    await this.repository.delete({ address });
  }

  async findAll(): Promise<string[]> {
    const rows = await this.repository.find();
    return rows.map((r) => r.address);
  }
}
