import { IsOptional, IsIn, IsUUID, IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class SalesReportFilterDto {
  @IsOptional() @IsIn(['day', 'week', 'month', 'year']) groupBy?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsUUID() salesRepId?: string;
  @IsOptional() @IsString() channel?: string;
  @IsOptional() @IsUUID() categoryId?: string;
}

export class InventoryMovementFilterDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsUUID() productId?: string;
  @IsOptional() @IsUUID() warehouseId?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsString() productCode?: string;
  @IsOptional() @IsIn(['all', 'in_stock', 'out_of_stock', 'low_stock']) stockFilter?: string;
}

export class DeadstockFilterDto {
  @IsOptional() @IsUUID() warehouseId?: string;
  @IsOptional() @IsNumber() @Type(() => Number) daysSinceLastSale?: number;
}

export class FinanceReportFilterDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}

export class CommissionFilterDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsUUID() userId?: string;
}

export class KpiFilterDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsUUID() userId?: string;
}

export class DebtByCustomerFilterDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() customerCode?: string;
  @IsOptional() @IsIn(['all', 'has_debt', 'no_debt', 'over_limit']) debtFilter?: string;
}

export class DebtBySupplierFilterDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() supplierCode?: string;
  @IsOptional() @IsIn(['all', 'has_debt', 'no_debt']) debtFilter?: string;
}

export class PurchaseBySupplierFilterDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() supplierCode?: string;
  @IsOptional() @IsIn(['all', 'paid', 'partial', 'unpaid']) paymentFilter?: string;
}

export class SalesByProductFilterDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() productCode?: string;
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string') {
      return value.split(',').map((v) => v.trim()).filter(Boolean);
    }
    return undefined;
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  productIds?: string[];
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsIn(['net_revenue', 'quantity_sold', 'product_code']) sortBy?: string;
}

export class SalesByCustomerFilterDto {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() customerCode?: string;
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string') {
      return value.split(',').map((v) => v.trim()).filter(Boolean);
    }
    return undefined;
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  customerIds?: string[];
  @IsOptional() @IsIn(['all', 'has_debt', 'no_debt']) debtFilter?: string;
}

export class CommissionRuleDto {
  @IsNumber() minRevenue: number;
  @IsNumber() rate: number;
}

export class UpdateCommissionConfigDto {
  @IsIn(['REVENUE_PERCENT', 'PROFIT_PERCENT', 'PRODUCT_SPECIFIC'])
  type: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommissionRuleDto)
  rules: CommissionRuleDto[];
}
