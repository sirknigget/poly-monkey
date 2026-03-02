import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { compare } from 'bcryptjs';
import { Request } from 'express';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const adminKeyHash = this.configService.get<string>('ADMIN_KEY_HASH');
    if (!adminKeyHash) {
      throw new UnauthorizedException();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const incomingKey = request.headers['x-admin-key'];

    if (!incomingKey || typeof incomingKey !== 'string') {
      throw new UnauthorizedException();
    }

    const isValid = await compare(incomingKey, adminKeyHash);
    if (!isValid) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
