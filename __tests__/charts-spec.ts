import { Charts } from '../src/charts';
import { PoolRequest } from '@vigcoin/pool-request';
import { Logger } from '@vigcoin/logger';
import { RedisClient } from 'redis';
import * as nock from 'nock';

const pr = new PoolRequest({}, {}, {});
const logger = new Logger({});
const redis = new RedisClient({});
const charts = new Charts(
  {
    pool: {
      enabled: true,
    },
    user: {
      hashrate: {
        enabled: true,
      },
    },
  },
  pr,
  logger
);

let stats = nock('http://localhost')
  .post('/stats')
  .reply(200, { error: 'ok' });

let minersHashrate = nock('http://localhost')
  .post('/miners_hashrate')
  .reply(200, { error: 'ok' });

test('Should create charts', () => {
  expect(charts).toBeTruthy();
});

test('Should start looping', () => {
  charts.start(redis, 'vig');
});

test('Should clear env', () => {
  redis.quit();
  charts.stopAll();
});
