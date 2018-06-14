import * as _ from 'lodash';

import { Logger } from '@vigcoin/logger';
import { PoolRequest } from '@vigcoin/pool-request';
import { RedisClient } from 'redis';

import { ValueHandler } from './value-handler';

import { promisify } from 'util';

export class Charts {
  private name = 'charts';
  private config: any;
  private req: PoolRequest;
  private logger: Logger;
  private poolIntervals: any = {};
  private userInterval: any;

  private poolStatus: any;

  private preSaveFunctions: any = {
    difficulty: ValueHandler.avgRound,
    hashrate: ValueHandler.avgRound,
    price: ValueHandler.avg,
    profit: ValueHandler.avg,
    workers: ValueHandler.max,
  };

  constructor(config: any, req: PoolRequest, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.req = req;
  }

  public start(redis: RedisClient, coin: string) {
    this.logger.append('info', this.name, 'Started', []);

    // Looping pool data
    const { charts } = this.config;
    for (const key of Object.keys(charts.pool)) {
      const settings = charts.pool[key];
      if (settings.enabled) {
        this.startPool(key, settings);
      }
    }

    const hashrate = charts.user.hashrate;
    if (hashrate.enabled) {
      this.startUser(redis, coin, hashrate);
    }
  }

  public async getPoolChartsData(redis: RedisClient, coin: string) {
    const chartsNames: any = [];
    const redisKeys = [];
    const { charts } = this.config;

    for (const chartName in charts.pool) {
      if (charts.pool[chartName].enabled) {
        chartsNames.push(chartName);
        redisKeys.push(this.getRedisKey(coin, chartName));
      }
    }
    if (redisKeys.length) {
      const mget = promisify(redis.mget).bind(redis);

      const data = await mget(redisKeys);
      const stats: any = {};

      if (data) {
        for (const key of Object.keys(data)) {
          if (data[key]) {
            stats[chartsNames[key]] = JSON.parse(data[key]);
          }
        }
      }
      return stats;
    }
  }

  public async getUserCharts(
    redis: RedisClient,
    coin: string,
    address: string
  ) {
    const enabled = _.get(this.config.charts, 'user.hashrate.enabled');
    if (enabled) {
      return this.getDataFromRedis(redis, coin, 'hashrate:' + address, true);
    }
    return null;
  }

  public stopAll() {
    for (const key of Object.keys(this.poolIntervals)) {
      this.stopPool(key);
    }
    this.stopUser();
  }

  public stopPool(name: string) {
    if (this.poolIntervals[name]) {
      clearInterval(this.poolIntervals[name]);
    }
  }

  public getPoolHashRate() {
    return this.getStatus('pool.hashrate');
  }

  public getPoolWorkers() {
    return this.getStatus('pool.miners');
  }

  public getNetworkDifficulty() {
    return this.getStatus('network.difficulty');
  }

  public async storeValue(
    redis: RedisClient,
    coin: string,
    name: string,
    value: string,
    settings: any
  ) {
    const sets = await this.getDataFromRedis(redis, coin, name);
    const now = Date.now() / 1000;
    if (!sets.length) {
      sets.push([now, value, 1]);
    } else {
      const lastSet = sets[sets.length - 1]; // set format: [time, avgValue, updatesCount]
      if (now - lastSet[0] > settings.setInterval) {
        while (sets.length && now - sets[0][0] > settings.maximumPeriod) {
          // clear old sets
          sets.shift();
        }
      } else {
        this.preSaveFunctions[name]
          ? this.preSaveFunctions[name](lastSet, value)
          : ValueHandler.avgRound(lastSet, value);
        lastSet[2]++;
      }
    }

    const set = promisify(redis.set).bind(redis);
    await set(this.getRedisKey(coin, name), JSON.stringify(sets));
    this.logger.append(
      'info',
      this.name,
      name +
        ' chart collected value ' +
        value +
        '. Total sets count ' +
        sets.length,
      []
    );
  }

  private getStatus(key: string) {
    if (this.poolStatus && this.poolStatus.pool) {
      const value = _.get(this.poolStatus, key);
      return Math.round(value);
    }
    return null;
  }

  private stopUser() {
    if (this.userInterval) {
      clearInterval(this.userInterval);
    }
  }

  private async getPoolStatus() {
    this.poolStatus = await this.req.pool('/stats', '');
  }

  private startPool(name: string, settings: any) {
    this.stopPool(name);
    this.poolIntervals[name] = setInterval(async () => {
      await this.getPoolStatus();
    }, settings.updateInterval * 1000);
  }

  // Redis related
  private getRedisKey(coin: string, name: string, array: boolean = false) {
    const data = [coin, this.name, name];
    if (array) {
      return data;
    }
    return data.join(':');
  }

  private async getDataFromRedis(
    redis: RedisClient,
    coin: string,
    name: string,
    notArray: boolean = false
  ) {
    const key = this.getRedisKey(coin, name);
    const get = promisify(redis.get).bind(redis);

    let sets = await get(key);
    sets = sets ? JSON.parse(sets) : [];
    if (sets instanceof Array) {
      return sets;
    }
    if (notArray) {
      return sets;
    }
    return [];
  }

  // User related

  // private convertPaymentsDataToChart(paymentsData: any[]) {
  //   const data = [];
  //   if (paymentsData && paymentsData.length) {
  //     for (let i = 0; paymentsData[i]; i += 2) {
  //       data.unshift([+paymentsData[i + 1], paymentsData[i].split(':')[1]]);
  //     }
  //   }
  //   return data;
  // }

  private async getUsersData() {
    return this.req.pool(
      '/miners_hashrate?password=' + this.config.api.password
    );
  }

  private startUser(redis: RedisClient, coin: string, settings: any) {
    this.stopUser();
    this.userInterval = setInterval(async () => {
      try {
        await this.collectUsersHashrate(redis, coin, 'hashrate', settings);
      } catch (e) {
        this.logger.append('error', this.name, 'User Hash rate error', [e]);
        return;
      }
    }, settings.updateInterval * 1000);
  }

  private async collectUsersHashrate(
    redis: RedisClient,
    coin: string,
    name: string,
    settings: any
  ) {
    let keys: any = this.getRedisKey(coin, name, true);
    keys.push('*');
    keys = keys.join(':');

    const redisKeys = promisify(redis.keys).bind(redis);
    keys = await redisKeys(keys);

    const hashrates: any = {};
    // zero user hashrates
    for (const key of Object.keys(keys)) {
      hashrates[keys[key].substr(keys[key].length)] = 0;
    }

    const data: any = await this.getUsersData();

    // update user hashrates
    if (data && data.newHashrates) {
      for (const address of Object.keys(data.newHashrates)) {
        hashrates[address] = data.newHashrates[address];
      }
    }

    for (const address of Object.keys(hashrates)) {
      this.storeValue(
        redis,
        coin,
        name + ':' + address,
        hashrates[address],
        settings
      );
    }
  }
}
