import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { ActivityNotifierQueueService } from './activity-notifier-queue.service';

@Controller('activity')
@UseGuards(AdminAuthGuard)
export class ActivityNotifierController {
  constructor(
    private readonly activityNotifierQueueService: ActivityNotifierQueueService,
  ) {}

  @Post('notify')
  @HttpCode(HttpStatus.OK)
  async notify(): Promise<string> {
    await this.activityNotifierQueueService.enqueueNotification();
    return 'Triggered';
  }
}
