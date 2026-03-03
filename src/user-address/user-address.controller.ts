import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { UserAddressDao } from './user-address.dao';
import { UserManagerService } from './user-manager.service';

@Controller('user-addresses')
@UseGuards(AdminAuthGuard)
export class UserAddressController {
  constructor(
    private readonly userManagerService: UserManagerService,
    private readonly userAddressDao: UserAddressDao,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async add(@Body('address') address: string): Promise<void> {
    await this.userManagerService.add(address);
  }

  @Delete(':address')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('address') address: string): Promise<void> {
    await this.userAddressDao.delete(address);
  }

  @Get()
  async list(): Promise<string[]> {
    const users = await this.userAddressDao.findAll();
    return users.map((u) => u.address);
  }

  @Put('profiles/refresh')
  @HttpCode(HttpStatus.NO_CONTENT)
  async refreshProfiles(): Promise<void> {
    await this.userManagerService.refreshAllProfiles();
  }
}
