const { getResponse } = require('@server/utils/testUtils');
const { get } = require('lodash');

describe('scheduleJobMutation tests', () => {
  const JOB_ID = 1;
  it('should resolve success true', async () => {
    jest.doMock('bull', () =>
      jest.fn().mockImplementation(() => ({
        add: () => Promise.resolve({ id: JOB_ID }),
        process: () => {}
      }))
    );
    const args = {
      scheduleIn: 1000,
      message: 'Hello'
    };
    const scheduleJobMutation = `
      mutation ScheduleJob {
        scheduleJob(scheduleIn: ${args.scheduleIn}, message: "${args.message}") {
          success
        }
      }
    `;
    const result = await getResponse(scheduleJobMutation);
    expect(get(result, 'body.data.scheduleJob.success')).toBe(true);
  });

  it('should resolve success false', async () => {
    jest.doMock('bull', () =>
      jest.fn().mockImplementation(() => ({
        add: () => Promise.reject(new Error('unable to create queue')),
        process: () => {}
      }))
    );
    const args = {
      scheduleIn: 1000,
      message: 'Hello'
    };
    const scheduleJobMutation = `
      mutation ScheduleJob {
        scheduleJob(scheduleIn: ${args.scheduleIn}, message: "${args.message}") {
          success
        }
      }
    `;
    const result = await getResponse(scheduleJobMutation);

    expect(get(result, 'body.data.scheduleJob.success')).toBe(false);
  });
});
