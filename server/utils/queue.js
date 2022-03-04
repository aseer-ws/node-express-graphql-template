import Bull from 'bull';
import moment from 'moment';

const queues = {};

export const QUEUE_NAMES = {
  SCHEDULE_JOBS: 'scheduleJob'
};

export const QUEUE_PROCESSORS = {
  [QUEUE_NAMES.SCHEDULE_JOBS]: (job, done) => {
    console.log(`${moment()}::Job with id: ${job.id} is being executed.\n`);
  }
};

export const initQues = () => {
  console.log('init queues');
  Object.keys(QUEUE_PROCESSORS).forEach(queueName => {
    queues[queueName] = getQueue(queueName);
  });
};

export const getQueue = queueName => {
  if (!queues[queueName]) {
    queues[queueName] = new Bull(queueName, `redis://${process.env.REDIS_DOMAIN}:${process.env.REDIS_PORT}`);
    console.log('created queue: ', queueName, `redis://${process.env.REDIS_DOMAIN}:${process.env.REDIS_PORT}`);
  }

  return queues[queueName];
};
