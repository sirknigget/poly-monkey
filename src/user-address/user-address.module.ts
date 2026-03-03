import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggingModule } from '../logging/logging.module';
import { PolymarketApiModule } from '../polymarket-api/polymarket-api.module';
import { UserAddressController } from './user-address.controller';
import { UserAddressDao } from './user-address.dao';
import { UserAddress } from './user-address.entity';
import { UserManagerService } from './user-manager.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserAddress]),
    PolymarketApiModule,
    LoggingModule,
  ],
  controllers: [UserAddressController],
  providers: [UserAddressDao, UserManagerService],
  exports: [UserAddressDao],
})
export class UserAddressModule {}
