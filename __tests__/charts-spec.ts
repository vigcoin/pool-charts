import { Charts } from '../src/charts';
import { PoolRequest } from '@vigcoin/pool-request';
import { Logger } from '@vigcoin/logger';
import { RedisClient } from 'redis';
import { promisify } from 'util';
import * as nock from 'nock';
import * as request from 'request';

import * as express from 'express';

let visited = false;

const app = express();
const app1 = express();
const port = parseInt((Math.random() * 10000).toFixed(0)) + 1024;

const pr = new PoolRequest(
  {},
  {},
  {
    host: 'localhost',
    port,
  }
);

const pr1 = new PoolRequest(
  {},
  {},
  {
    host: 'localhost',
    port: port + 1,
  }
);
const logger = new Logger({});
const redis = new RedisClient({});
const charts = new Charts(
  {
    api: {
      password: 'aaa',
    },
    charts: {
      pool: {
        hashrate: {
          enabled: true,
          updateInterval: 0.1,
          stepInterval: 1800,
          maximumPeriod: 86400,
        },
        workers: {
          enabled: true,
          updateInterval: 0.1,
          stepInterval: 1800,
          maximumPeriod: 86400,
        },
        difficulty: {
          enabled: true,
          updateInterval: 0.1,
          stepInterval: 10800,
          maximumPeriod: 604800,
        },
        price: {
          enabled: true,
          updateInterval: 0.1,
          stepInterval: 10800,
          maximumPeriod: 604800,
        },
        profit: {
          enabled: true,
          updateInterval: 0.1,
          stepInterval: 10800,
          maximumPeriod: 604800,
        },
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
  },
  pr,
  logger
);

const charts1 = new Charts(
  {
    api: {
      password: 'aaa',
    },
    charts: {
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
  },
  pr,
  logger
);

const charts2 = new Charts(
  {
    api: {
      password: 'aaa',
    },
    charts: {
      pool: {
        enabled: true,
      },
      user: {
        hashrate: {
          enabled: false,
          updateInterval: 0.1,
          setInterval: 10,
          maximumPeriod: 10,
        },
      },
    },
  },
  pr,
  logger
);

const charts3 = new Charts(
  {
    api: {
      password: 'aaa',
    },
    charts: {
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
  },
  pr1,
  logger
);

app.get('/stats', (req, res) => {
  res.json({
    pool: {
      hashrate: 100,
      miners: 101,
    },
    network: {
      difficulty: 102,
    },
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
      bbb: 1000,
    },
  });
});

app1.get('/miners_hashrate', (req, res) => {
  res.json({});
});

const server = app.listen(port);
const server1 = app1.listen(port + 1);

test('Should clear some data', async () => {
  let del = promisify(redis.del).bind(redis);
  await del('vig:charts:hashrate:aaa');
  await del('vig:charts:hashrate:bbb');
  await del('vig:charts:hashrate:aaauuu');
  await del('vig:charts:hashrate:');
});

test('Should create charts', () => {
  expect(charts).toBeTruthy();
});

test('Should not get stats before start looping', () => {
  const hashrate = charts.getPoolHashRate();
  const miners = charts.getPoolWorkers();
  const difficulty = charts.getNetworkDifficulty();
  expect(hashrate).toBe(null);
  expect(miners).toBe(null);
  expect(difficulty).toBe(null);
});

test('Should start looping with no data', done => {
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
});

test('Should start looping', done => {
  charts.start(redis, 'vig');
  setTimeout(() => {
    charts.stopAll();
    done();
  }, 300);
});

test('Should start looping again', done => {
  charts1.start(redis, 'vig');
  setTimeout(() => {
    charts1.stopAll();
    done();
  }, 300);
});

test('Should start looping 2', done => {
  charts3.start(redis, 'vig');
  setTimeout(() => {
    charts3.stopAll();
    done();
  }, 500);
});

test('Should start looping 3', done => {
  charts2.start(redis, 'vig');
  setTimeout(() => {
    charts2.stopAll();
    done();
  }, 500);
});

test('Should get stats', () => {
  const hashrate = charts.getPoolHashRate();
  const miners = charts.getPoolWorkers();
  const difficulty = charts.getNetworkDifficulty();
  expect(hashrate).toBe(100);
  expect(miners).toBe(101);
  expect(difficulty).toBe(102);
});

test('Should not get user data', async () => {
  const userCharts = await charts.getUserCharts(redis, 'vig', 'aaauuu');
  const userCharts2 = await charts2.getUserCharts(redis, 'vig', 'aaauuu');
  expect(userCharts instanceof Array).toBeTruthy();
  expect(userCharts.length).toBe(0);
  expect(userCharts2).toBe(null);
});

test('Should init some data', async () => {
  let mset = promisify(redis.mset).bind(redis);
  await mset('vig:charts:hashrate:aaauuu', 100);
});

test('Should get user data', async () => {
  const userCharts = await charts.getUserCharts(redis, 'vig', 'aaauuu');
  expect(userCharts).toBe(100);
});

test('Should set pool data', async () => {
  let mset = promisify(redis.mset).bind(redis);
  let keys = promisify(redis.keys).bind(redis);
  await mset('vig:charts:hashrate', 100);
  await mset('vig:charts:workers', 101);
  await mset('vig:charts:difficulty', 102);
  await mset('vig:charts:price', 103);
  await mset('vig:charts:profit', 104);
});

test('Should be able to get Pool Status charts', async () => {
  const poolCharts = await charts.getPoolChartsData(redis, 'vig');
  expect(poolCharts).toBeTruthy();
  expect(poolCharts.hashrate).toBe(100);
  expect(poolCharts.workers).toBe(101);
  expect(poolCharts.difficulty).toBe(102);
  expect(poolCharts.price).toBe(103);
  expect(poolCharts.profit).toBe(104);
});

test('Should clear env', () => {
  redis.quit();
  server.close();
});
