describe('queue tests', () => {
  const JOB_ID = 1;
  let addSpy;
  let doneSpy;
  let processSpy;

  beforeAll(() => {
    addSpy = jest.fn();
    doneSpy = jest.fn();
    processSpy = jest.fn();
    jest.doMock('bull', () =>
      jest.fn().mockImplementation(() => ({
        add: addSpy,
        process: jobFn => {
          processSpy(jobFn);
          jobFn({ id: JOB_ID }, doneSpy);
        }
      }))
    );
  });

  describe('getQue tests', () => {
    it('should create new queue for given queue name if queue is not created', () => {
      const Bull = require('bull');

      const { getQueue } = require('../queue');
      const queueName = 'TEST_QUEUE';
      getQueue(queueName);
      expect(Bull).toBeCalledWith(queueName, `redis://${process.env.REDIS_DOMAIN}:${process.env.REDIS_PORT}`);
    });

    it('should return existing queue if queue is already created with queueName', () => {
      const Bull = require('bull');

      const { getQueue } = require('../queue');
      const queueName = 'TEST_QUEUE';
      getQueue(queueName);
      getQueue(queueName);
      expect(Bull).toBeCalledTimes(1);
    });
  });

  describe('initQues tests', () => {
    it('should initialise all named queues and process them', () => {
      const Bull = require('bull');

      const { initQues, QUEUE_PROCESSORS } = require('../queue');
      initQues();
      const queueProcessesCount = Object.keys(QUEUE_PROCESSORS).length;
      expect(Bull).toBeCalledTimes(queueProcessesCount);
      for (const processKey in QUEUE_PROCESSORS) {
        expect(processSpy).toBeCalledWith(QUEUE_PROCESSORS[processKey]);
      }
      expect(processSpy).toBeCalledTimes(queueProcessesCount);
      expect(addSpy).toBeCalledTimes(queueProcessesCount - 1);
      expect(doneSpy).toBeCalledTimes(3);
    });
  });
});
