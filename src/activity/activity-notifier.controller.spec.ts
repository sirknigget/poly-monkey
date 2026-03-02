import { TestBed, Mocked } from '@suites/unit';
import { ActivityNotifierController } from './activity-notifier.controller';
import { ActivityNotifierQueueService } from './activity-notifier-queue.service';

describe('ActivityNotifierController', () => {
  let controller: ActivityNotifierController;
  let mockQueueService: Mocked<ActivityNotifierQueueService>;

  beforeAll(async () => {
    const { unit, unitRef } = await TestBed.solitary(
      ActivityNotifierController,
    ).compile();
    controller = unit;
    mockQueueService = unitRef.get(ActivityNotifierQueueService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueueService.enqueueNotification.mockResolvedValue(undefined);
  });

  it('enqueues a notification job and returns "Triggered"', async () => {
    const result = await controller.notify();

    expect(mockQueueService.enqueueNotification).toHaveBeenCalledTimes(1);
    expect(result).toBe('Triggered');
  });
});
