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

  it('delegates to ActivityNotifierService with fetchLimit from job data', async () => {
    await processor.process({ data: { fetchLimit: 10 } } as any);

    expect(mockService.notifyNewActivities).toHaveBeenCalledWith(10);
  });

  it('delegates to ActivityNotifierService with undefined when job data has no fetchLimit', async () => {
    await processor.process({ data: {} } as any);

    expect(mockService.notifyNewActivities).toHaveBeenCalledWith(undefined);
  });
});
