import Bull from 'bull';
import moment from 'moment';
import { SUBSCRIPTION_TOPICS } from '@utils/constants';
import { pubsub } from './pubsub';

/** @type {Object.<string, Bull.Queue>} */
const queues = {};

export const QUEUE_NAMES = {
  SCHEDULE_JOB: 'scheduleJob',
  MIDNIGHT_CRON: 'midnightCron',
  EVERY_MINUTE_CRON: 'everyMinuteCron'
};

const CRON_EXPRESSIONS = {
  MIDNIGHT: '0 0 * * *',
  EVERY_MINUTE: '* * * * *'
};

export const QUEUE_PROCESSORS = {
  [QUEUE_NAMES.SCHEDULE_JOB]: (job, done) => {
    console.log(`${moment()}::Job with id: ${job.id} is being executed.\n`);
    done();
  },
  [QUEUE_NAMES.MIDNIGHT_CRON]: (job, done) => {
    console.log(`${moment()}:: The "${QUEUE_NAMES.MIDNIGHT_CRON}" is being executed at 12:00 AM`);
    done();
  },
  [QUEUE_NAMES.EVERY_MINUTE_CRON]: (job, done) => {
    console.log(`publishing to ${SUBSCRIPTION_TOPICS.NOTIFICATIONS}`);
    pubsub.publish(SUBSCRIPTION_TOPICS.NOTIFICATIONS, {
      notifications: {
        message: 'This is a message from cron',
        scheduleIn: 0
      }
    });
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
  queues[QUEUE_NAMES.EVERY_MINUTE_CRON].add({}, { repeat: { cron: CRON_EXPRESSIONS.EVERY_MINUTE } });
};

/** @returns {Bull.Queue} */
export const getQueue = queueName => {
  if (!queues[queueName]) {
    queues[queueName] = new Bull(queueName, `redis://${process.env.REDIS_DOMAIN}:${process.env.REDIS_PORT}`);
    console.log('created queue: ', queueName, `redis://${process.env.REDIS_DOMAIN}:${process.env.REDIS_PORT}`);
  }

  return queues[queueName];
};
