import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import {
  ACTIVITY_NOTIFIER_QUEUE,
  NOTIFY_JOB_NAME,
} from './activity-notifier-queue.constants';

@Injectable()
export class ActivityNotifierQueueService {
  constructor(
    @InjectQueue(ACTIVITY_NOTIFIER_QUEUE) private readonly queue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async enqueueNotification(): Promise<void> {
    const fetchLimit = this.configService.getOrThrow<number>(
      'ACTIVITY_FETCH_LIMIT',
    );
    await this.queue.add(NOTIFY_JOB_NAME, { fetchLimit });
  }
}
