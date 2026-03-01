import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ActivityNotifierService } from './activity-notifier.service';

@Controller('activity')
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
