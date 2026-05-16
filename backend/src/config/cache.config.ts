import { registerAs } from '@nestjs/config';

export default registerAs('cache', () => ({
  upstashUrl: process.env.UPSTASH_REDIS_REST_URL ?? '',
  upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
}));
