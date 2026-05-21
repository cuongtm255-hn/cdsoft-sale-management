import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8080', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  ezaccPrivateKey: process.env.EZACC_LICENSE_PRIVATE_KEY || '',
  ezaccPublicKey: process.env.EZACC_LICENSE_PUBLIC_KEY || '',
}));
