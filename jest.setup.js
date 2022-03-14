import { mockDBClient } from '@server/utils/testUtils';
import { DB_ENV } from '@utils/testUtils/mockData';

jest.doMock('@database', () => ({
  getClient: () => mockDBClient().client,
  client: mockDBClient().client,
  connect: () => {}
}));
jest.doMock('@database/models', () => ({
  ...mockDBClient().models
}));

jest.doMock('ioredis', () => jest.fn().mockImplementation(() => ({ publish: jest.fn(), subscribe: jest.fn() })));
jest.doMock('graphql-redis-subscriptions', () => ({
  RedisPubSub: jest.fn().mockImplementation(() => ({ publish: jest.fn() }))
}));

process.env.ENVIRONMENT_NAME = 'test';
beforeEach(() => {
  process.env = { ...process.env, ...DB_ENV, ENVIRONMENT_NAME: 'test' };
});
afterEach(() => {
  jest.clearAllMocks();
  jest.resetAllMocks();
  jest.resetModules();
});
