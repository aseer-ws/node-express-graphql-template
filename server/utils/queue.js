import Bull from 'bull';
import moment from 'moment';

/** @type {Object.<string, Bull.Queue>} */
const queues = {};

export const QUEUE_NAMES = {
  SCHEDULE_JOB: 'scheduleJob',
  MIDNIGHT_CRON: 'midnightCron'
};

const CRON_EXPRESSIONS = {
  MIDNIGHT: '0 0 * * *'
};

export const QUEUE_PROCESSORS = {
  [QUEUE_NAMES.SCHEDULE_JOB]: (job, done) => {
    console.log(`${moment()}::Job with id: ${job.id} is being executed.\n`);
    done();
  },
  [QUEUE_NAMES.MIDNIGHT_CRON]: (job, done) => {
    console.log({ job, done });
    console.log(`${moment()}:: The "${QUEUE_NAMES.MIDNIGHT_CRON}" is being executed at 12:00 AM`);
    done();
  }
};

export const initQues = () => {
  console.log('init queues');
  Object.keys(QUEUE_PROCESSORS).forEach(queueName => {
    queues[queueName] = getQueue(queueName);
    queues[queueName].process(QUEUE_PROCESSORS[queueName]);
  });
  queues[QUEUE_NAMES.MIDNIGHT_CRON].add({}, { repeat: { cron: CRON_EXPRESSIONS.MIDNIGHT } });
};

/** @returns {Bull.Queue} */
export const getQueue = queueName => {
  if (!queues[queueName]) {
    queues[queueName] = new Bull(queueName, `redis://${process.env.REDIS_DOMAIN}:${process.env.REDIS_PORT}`);
    console.log('created queue: ', queueName, `redis://${process.env.REDIS_DOMAIN}:${process.env.REDIS_PORT}`);
  }

  return queues[queueName];
};
