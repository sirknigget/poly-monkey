import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { UserAddressDao } from './user-address.dao';

@Controller('user-addresses')
export class UserAddressController {
  constructor(private readonly userAddressDao: UserAddressDao) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async add(@Body('address') address: string): Promise<void> {
    await this.userAddressDao.add(address);
  }

  @Delete(':address')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('address') address: string): Promise<void> {
    await this.userAddressDao.delete(address);
  }

  @Get()
  async list(): Promise<string[]> {
    return this.userAddressDao.findAll();
  }
}
