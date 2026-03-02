import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ACTIVITY_NOTIFIER_QUEUE } from './activity-notifier-queue.constants';
import { ActivityNotifierService } from './activity-notifier.service';

@Processor(ACTIVITY_NOTIFIER_QUEUE)
export class ActivityNotifierProcessor extends WorkerHost {
  constructor(
    private readonly activityNotifierService: ActivityNotifierService,
    private readonly logger: Logger,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id}`);
    await this.activityNotifierService.notifyNewActivities();
  }
}
