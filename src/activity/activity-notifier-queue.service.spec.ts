import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ActivityNotifierQueueService } from './activity-notifier-queue.service';
import {
  ACTIVITY_NOTIFIER_QUEUE,
  NOTIFY_JOB_NAME,
} from './activity-notifier-queue.constants';

describe('ActivityNotifierQueueService', () => {
  let service: ActivityNotifierQueueService;
  const mockQueue = { add: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ActivityNotifierQueueService,
        {
          provide: getQueueToken(ACTIVITY_NOTIFIER_QUEUE),
          useValue: mockQueue,
        },
      ],
    }).compile();
    service = module.get(ActivityNotifierQueueService);
  });

  beforeEach(() => jest.clearAllMocks());

  it('adds a notify job with empty data', async () => {
    mockQueue.add.mockResolvedValue({ id: '1' });

    await service.enqueueNotification();

    expect(mockQueue.add).toHaveBeenCalledWith(NOTIFY_JOB_NAME, {});
  });
});
