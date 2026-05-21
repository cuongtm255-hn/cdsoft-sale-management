import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisCacheService {
  private readonly redis: Redis | null = null;
  private readonly logger = new Logger(RedisCacheService.name);

  private readonly prefix = 'sale-platform-';

  constructor(config: ConfigService) {
    const url = config.get<string>('cache.upstashUrl');
    const token = config.get<string>('cache.upstashToken');
    if (url && token) {
      this.redis = new Redis({ url, token });
      this.logger.log('Upstash Redis cache initialized');
    } else {
      this.logger.warn('UPSTASH_REDIS_REST_URL/TOKEN not set — caching disabled');
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    const prefixedKey = `${this.prefix}${key}`;
    try {
      return await this.redis.get<T>(prefixedKey);
    } catch (e: any) {
      this.logger.warn(`Cache GET failed [${prefixedKey}]: ${e.message}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.redis) return;
    const prefixedKey = `${this.prefix}${key}`;
    try {
      await this.redis.set(prefixedKey, value, { ex: ttlSeconds });
    } catch (e: any) {
      this.logger.warn(`Cache SET failed [${prefixedKey}]: ${e.message}`);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.redis || keys.length === 0) return;
    const prefixedKeys = keys.map((k) => `${this.prefix}${k}`);
    try {
      await this.redis.del(...prefixedKeys);
    } catch (e: any) {
      this.logger.warn(`Cache DEL failed [${prefixedKeys.join(', ')}]: ${e.message}`);
    }
  }

  // Convenience: get from cache or fetch from DB and populate cache
  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const data = await fetcher();
    await this.set(key, data, ttlSeconds);
    return data;
  }
}
