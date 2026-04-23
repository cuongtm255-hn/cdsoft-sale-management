import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local trước, sau đó fallback sang .env
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * DataSource dùng cho TypeORM CLI:
 *   npm run migration:generate -- --name=MyMigration
 *   npm run migration:run
 *   npm run migration:revert
 *   npm run migration:show
 */
export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'salesplatform_system',

  entities: [path.resolve(__dirname, '../platform/**/*.entity{.ts,.js}')],
  migrations: [path.resolve(__dirname, './migrations/*{.ts,.js}')],

  synchronize: false,
  logging: true,
});
