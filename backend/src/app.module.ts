import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import seedConfig from './config/seed.config';
import { PlatformModule } from './platform/platform.module';
import { TenantContextModule } from './tenant/tenant.module';
import { TenantAppModule } from './tenant-module/tenant-app.module';
import { DatabaseInitModule } from './database/database-init.module';
import { TenantContextMiddleware } from './tenant/tenant-context.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, seedConfig],
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
        entities: [__dirname + '/platform/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        // synchronize: false — dùng migration thay vì auto-sync
        synchronize: false,
        migrationsRun: false, // DatabaseInitService sẽ gọi thủ công để có thể log rõ ràng
        logging: config.get('app.env') === 'development',
      }),
      inject: [ConfigService],
    }),
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
