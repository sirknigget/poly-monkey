import { TestBed, Mocked } from '@suites/unit';
import { ActivityNotifierProcessor } from './activity-notifier.processor';
import { ActivityNotifierService } from './activity-notifier.service';

describe('ActivityNotifierProcessor', () => {
  let processor: ActivityNotifierProcessor;
  let mockService: Mocked<ActivityNotifierService>;

  beforeAll(async () => {
    const { unit, unitRef } = await TestBed.solitary(
      ActivityNotifierProcessor,
    ).compile();
    processor = unit;
    mockService = unitRef.get(ActivityNotifierService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockService.notifyNewActivities.mockResolvedValue(undefined);
  });

  it('delegates to ActivityNotifierService', async () => {
    await processor.process({ id: 'job-1' } as any);

    expect(mockService.notifyNewActivities).toHaveBeenCalledTimes(1);
  });
});
