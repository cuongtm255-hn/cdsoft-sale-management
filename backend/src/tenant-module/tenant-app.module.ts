import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TenantAuthController } from './auth/tenant-auth.controller';
import { TenantAuthService } from './auth/tenant-auth.service';
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { CategoriesController } from './categories/categories.controller';
import { CategoriesService } from './categories/categories.service';
import { CustomersController } from './customers/customers.controller';
import { CustomersService } from './customers/customers.service';
import { SuppliersController } from './suppliers/suppliers.controller';
import { SuppliersService } from './suppliers/suppliers.service';
import { InventoryController } from './inventory/inventory.controller';
import { WarehousesController } from './inventory/warehouses.controller';
import { InventoryService } from './inventory/inventory.service';
import { OrdersController } from './orders/orders.controller';
import { OrdersService } from './orders/orders.service';
import { InvoicesController } from './invoices/invoices.controller';
import { InvoicesService } from './invoices/invoices.service';
import { JwtStrategy } from '../common/strategies/jwt.strategy';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.get('jwt.secret'),
        signOptions: { expiresIn: config.get('jwt.accessExpiresIn', '8h') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [TenantAuthController, ProductsController, UsersController, CategoriesController, CustomersController, SuppliersController, InventoryController, WarehousesController, OrdersController, InvoicesController],
  providers: [TenantAuthService, ProductsService, UsersService, CategoriesService, CustomersService, SuppliersService, InventoryService, OrdersService, InvoicesService, JwtStrategy],
})
export class TenantAppModule {}
