import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TenantDataSourceManager } from './tenant/tenant-datasource.manager';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dsManager = app.get(TenantDataSourceManager);
  const mainDs = app.get(DataSource);
  
  const tenants = await mainDs.query('SELECT tenant_code FROM tenants LIMIT 1');
  if (tenants.length > 0) {
    const tenantCode = tenants[0].tenant_code;
    console.log('TENANT_CODE:', tenantCode);
    const ds = await dsManager.getDataSource(tenantCode);
    const products = await ds.query('SELECT id, name, cost_price, stock_quantity FROM products LIMIT 5');
    console.log('PRODUCTS:', products);
    
    const balances = await ds.query('SELECT * FROM inventory_balances LIMIT 5');
    console.log('BALANCES:', balances);
  } else {
    console.log('NO TENANTS FOUND');
  }
  await app.close();
}

bootstrap();
