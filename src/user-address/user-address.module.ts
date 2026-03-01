import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAddress } from './user-address.entity';
import { UserAddressDao } from './user-address.dao';
import { UserAddressController } from './user-address.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserAddress])],
  controllers: [UserAddressController],
  providers: [UserAddressDao],
  exports: [UserAddressDao],
})
export class UserAddressModule {}
