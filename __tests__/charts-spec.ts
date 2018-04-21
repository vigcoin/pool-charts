import { Charts } from '../src/charts';
import { PoolRequest } from '@vigcoin/pool-request';
import { Logger } from '@vigcoin/logger';
import { RedisClient } from 'redis';
import { promisify } from "util";
import * as nock from 'nock';
import * as request from "request";

const pr = new PoolRequest({}, {}, {
  host: 'pool',
  port: 80
});
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
        updateInterval: 0.1
      },
    },
  },
  pr,
  logger
);

let stats = nock('http://localhost')
  .get('/stats')
  .reply(200, { error: 'ok' });




test('Should create charts', () => {
  expect(charts).toBeTruthy();
});

test('Should start looping with no data', (done) => {
  let minersHashrate = nock('http://pool')
    .get('/miners_hashrate')
    .reply(200, {
      newHashrates: {
        aaa: 100,
        bbb: 1000
      }
    });
  charts.start(redis, 'vig');
  setTimeout(() => {
    charts.stopAll();
    done();
  }, 1000);
});

test('Should init some data', async () => {
  let mset = promisify(redis.mset).bind(redis);
  let keys = promisify(redis.keys).bind(redis);
  await mset('vig:charts:hashrate:aaa', 100);
  await mset('vig:charts:hashrate:bbb', 100);
  let data = await keys('vig:charts:hashrate:*');
  console.log(data);
});

test('Should start looping', (done) => {
  charts.start(redis, 'vig');
  setTimeout(() => {
    charts.stopAll();
    done();
  }, 1000);
});

test('Should clear env', () => {
  redis.quit();
});
