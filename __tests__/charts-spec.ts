import { Charts } from '../src/charts';
import { PoolRequest } from '@vigcoin/pool-request';
import { Logger } from '@vigcoin/logger';
import { RedisClient } from 'redis';
import { promisify } from "util";
import * as nock from 'nock';
import * as request from "request";

import * as express from "express";


let visited = false;

const app = express();
const port = parseInt((Math.random() * 10000).toFixed(0)) + 1024;

const pr = new PoolRequest({}, {}, {
  host: 'localhost',
  port
});
const logger = new Logger({});
const redis = new RedisClient({});
const charts = new Charts(
  {
    "pool": {
      "hashrate": {
        "enabled": true,
        "updateInterval": 0.1,
        "stepInterval": 1800,
        "maximumPeriod": 86400
      },
      "workers": {
        "enabled": true,
        "updateInterval": 0.1,
        "stepInterval": 1800,
        "maximumPeriod": 86400
      },
      "difficulty": {
        "enabled": true,
        "updateInterval": 0.1,
        "stepInterval": 10800,
        "maximumPeriod": 604800
      },
      "price": {
        "enabled": true,
        "updateInterval": 0.1,
        "stepInterval": 10800,
        "maximumPeriod": 604800
      },
      "profit": {
        "enabled": true,
        "updateInterval": 0.1,
        "stepInterval": 10800,
        "maximumPeriod": 604800
      }
    },

    user: {
      hashrate: {
        enabled: true,
        updateInterval: 0.1,
        setInterval: 0,
        maximumPeriod: 0,
      },
    },
  },
  pr,
  logger
);

const charts1 = new Charts(
  {
    pool: {
      enabled: true,
    },
    user: {
      hashrate: {
        enabled: true,
        updateInterval: 0.1,
        setInterval: 10,
        maximumPeriod: 10,
      },
    },
  },
  pr,
  logger
);


app.get('/stats', (req, res) => {
  console.log('inside express get stats');

  res.json({
    pool: {
      hashrate: 100,
      miners: 101
    },
    network: {
      difficulty: 102
    }
  });

});

app.get('/miners_hashrate', (req, res) => {

  if (!visited) {
    visited = true;
    return res.status(404).send('Not Found!');
  }

  res.json({
    newHashrates: {
      aaa: 100,
      bbb: 1000
    }
  });

});

const server = app.listen(port);

test('Should clear some data', async () => {
  let del = promisify(redis.del).bind(redis);
  await del('vig:charts:hashrate:aaa');
  await del('vig:charts:hashrate:bbb');
  await del('vig:charts:hashrate:');
});

test('Should create charts', () => {
  expect(charts).toBeTruthy();
});

test('Should start looping with no data', (done) => {
  charts.start(redis, 'vig');
  setTimeout(() => {
    charts.stopAll();
    done();
  }, 300);
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
  }, 300);
});

test('Should start looping again', (done) => {
  charts1.start(redis, 'vig');
  setTimeout(() => {
    charts1.stopAll();
    done();
  }, 300);
});

test('Should get stats', () => {
  const hashrate = charts.getPoolHashRate();
  const miners = charts.getPoolWorkers();
  const difficulty = charts.getNetworkDifficulty();
  expect(hashrate).toBe(100);
  expect(miners).toBe(101);
  expect(difficulty).toBe(102);
});

test('Should clear env', () => {
  redis.quit();
  server.close();
});
