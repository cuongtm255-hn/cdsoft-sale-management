import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { InitPlatformSchema1700000000000 } from './database/migrations/1700000000000-InitPlatformSchema';
import { PlatformSnakeCase1745800000000 } from './database/migrations/1745800000000-PlatformSnakeCase';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import seedConfig from './config/seed.config';
import cacheConfig from './config/cache.config';
import chatbotConfig from './config/chatbot.config';
import { RedisCacheModule } from './common/cache/redis-cache.module';
import { PlatformModule } from './platform/platform.module';
import { TenantContextModule } from './tenant/tenant.module';
import { TenantAppModule } from './tenant-module/tenant-app.module';
import { DatabaseInitModule } from './database/database-init.module';
import { TenantContextMiddleware } from './tenant/tenant-context.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, seedConfig, cacheConfig, chatbotConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port') || 3306,
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        ssl: config.get<boolean>('database.ssl') ? { rejectUnauthorized: false } : false,
        entities: [__dirname + '/platform/**/*.entity{.ts,.js}'],
        migrations: [InitPlatformSchema1700000000000, PlatformSnakeCase1745800000000],
        synchronize: false,
        migrationsRun: true,
        logging: config.get('app.env') === 'development',
        namingStrategy: new SnakeNamingStrategy(),
      }),
      inject: [ConfigService],
    }),
    RedisCacheModule,
    DatabaseInitModule,
    TenantContextModule,
    PlatformModule,
    TenantAppModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
