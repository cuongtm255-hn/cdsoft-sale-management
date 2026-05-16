import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';
import { ChatbotQuotaExceededException } from './chatbot-quota.exception';

const SECONDS_IN_36_HOURS = 36 * 60 * 60;

@Injectable()
export class ChatbotQuotaService {
  private readonly logger = new Logger(ChatbotQuotaService.name);
  private readonly redis: Redis | null;
  private readonly globalLimit: number;
  private readonly perUserLimit: number;

  // Fallback in-memory counters when Upstash not configured (dev/CI). Resets on process restart.
  private readonly memCounters = new Map<string, number>();

  constructor(config: ConfigService) {
    const url = config.get<string>('cache.upstashUrl');
    const token = config.get<string>('cache.upstashToken');
    this.redis = url && token ? new Redis({ url, token }) : null;
    if (!this.redis) {
      this.logger.warn(
        'Upstash Redis not configured — chatbot quota will use in-memory counters (NOT for production).',
      );
    }
    this.globalLimit = config.get<number>('chatbot.dailyGlobalLimit') ?? 20000;
    this.perUserLimit = config.get<number>('chatbot.dailyPerUserLimit') ?? 200;
  }

  private todayKey(): string {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }

  private async incr(key: string): Promise<number> {
    if (this.redis) {
      const value = await this.redis.incr(key);
      // Set TTL on first increment.
      if (value === 1) {
        await this.redis.expire(key, SECONDS_IN_36_HOURS);
      }
      return value;
    }
    const v = (this.memCounters.get(key) ?? 0) + 1;
    this.memCounters.set(key, v);
    return v;
  }

  private async peek(key: string): Promise<number> {
    if (this.redis) {
      const v = await this.redis.get<number>(key);
      return Number(v ?? 0);
    }
    return this.memCounters.get(key) ?? 0;
  }

  /** Pre-flight check before invoking OpenAI. Throws when over quota. Increments both counters atomically. */
  async checkAndConsume(tenantCode: string, userId: string): Promise<{ globalUsed: number; userUsed: number }> {
    const date = this.todayKey();
    const globalKey = `chatbot:quota:global:${date}`;
    const userKey = `chatbot:quota:user:${tenantCode}:${userId}:${date}`;

    // Peek first to avoid charging the counter on rejection.
    const [globalUsed, userUsed] = await Promise.all([this.peek(globalKey), this.peek(userKey)]);

    if (globalUsed >= this.globalLimit) {
      throw new ChatbotQuotaExceededException('global', this.globalLimit, globalUsed);
    }
    if (userUsed >= this.perUserLimit) {
      throw new ChatbotQuotaExceededException('user', this.perUserLimit, userUsed);
    }

    // Consume.
    const [newGlobal, newUser] = await Promise.all([this.incr(globalKey), this.incr(userKey)]);
    return { globalUsed: newGlobal, userUsed: newUser };
  }

  async getStatus(tenantCode: string, userId: string) {
    const date = this.todayKey();
    const [globalUsed, userUsed] = await Promise.all([
      this.peek(`chatbot:quota:global:${date}`),
      this.peek(`chatbot:quota:user:${tenantCode}:${userId}:${date}`),
    ]);
    return {
      date,
      globalUsed,
      globalLimit: this.globalLimit,
      userUsed,
      userLimit: this.perUserLimit,
      muted: userUsed >= this.perUserLimit || globalUsed >= this.globalLimit,
      muteScope:
        globalUsed >= this.globalLimit ? 'global' : userUsed >= this.perUserLimit ? 'user' : null,
    };
  }
}
