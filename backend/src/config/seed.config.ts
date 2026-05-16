import { registerAs } from '@nestjs/config';

export default registerAs('seed', () => ({
  superAdminUsername: process.env.SEED_SUPER_ADMIN_USERNAME,
  superAdminEmail: process.env.SEED_SUPER_ADMIN_EMAIL,
  superAdminPassword: process.env.SEED_SUPER_ADMIN_PASSWORD,
}));
