import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { ActivityNotifierService } from './activity-notifier.service';

@Controller('activity')
@UseGuards(AdminAuthGuard)
export class ActivityNotifierController {
  constructor(
    private readonly activityNotifierService: ActivityNotifierService,
  ) {}

  @Post('notify')
  @HttpCode(HttpStatus.OK)
  async notify(): Promise<void> {
    await this.activityNotifierService.notifyNewActivities();
  }
}
