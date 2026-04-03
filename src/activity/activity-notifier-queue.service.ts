import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  ACTIVITY_NOTIFIER_QUEUE,
  NOTIFY_JOB_NAME,
} from './activity-notifier-queue.constants';

@Injectable()
export class ActivityNotifierQueueService {
  constructor(
    @InjectQueue(ACTIVITY_NOTIFIER_QUEUE) private readonly queue: Queue,
    private readonly logger: Logger,
  ) {}

  async enqueueNotification(): Promise<void> {
    this.logger.debug(`Enqueuing notification job`);
    await this.queue.add(NOTIFY_JOB_NAME, {});
  }
}
