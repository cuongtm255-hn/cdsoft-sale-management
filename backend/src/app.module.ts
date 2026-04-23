import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import { ensureMysqlDatabaseExists } from './database/mysql-bootstrap.util';
import { DatabaseBootstrapService } from './database/database-bootstrap.service';
import { PlatformUser } from './platform/users/entities/platform-user.entity';
import { PlatformModule } from './platform/platform.module';
import { TenantContextModule } from './tenant/tenant.module';
import { TenantAppModule } from './tenant-module/tenant-app.module';

type AppDataSourceOptions = {
  autoCreateDatabase?: boolean;
} & MysqlConnectionOptions;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService): AppDataSourceOptions => ({
        type: 'mysql',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port') || 3306,
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        entities: [__dirname + '/platform/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        synchronize: config.get<boolean>('database.autoSyncSchema', true),
        migrationsRun: config.get<boolean>('database.autoRunMigrations', true),
        logging: config.get('app.env') === 'development',
        autoCreateDatabase: config.get<boolean>('database.autoCreateDatabase', true),
      }),
      dataSourceFactory: async (options) => {
        if (!options) {
          throw new Error('TypeORM options are required');
        }

        const typedOptions = options as AppDataSourceOptions;

        if (typedOptions.autoCreateDatabase) {
          await ensureMysqlDatabaseExists({
            host: typedOptions.host as string,
            port: typedOptions.port as number,
            username: typedOptions.username as string,
            password: typedOptions.password as string | undefined,
            database: typedOptions.database as string,
          });
        }

        const { autoCreateDatabase, ...dataSourceOptions } = typedOptions;
        const dataSource = new DataSource(dataSourceOptions);
        return dataSource.initialize();
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([PlatformUser]),
    TenantContextModule,
    PlatformModule,
    TenantAppModule,
  ],
  providers: [DatabaseBootstrapService],
})
export class AppModule {}
