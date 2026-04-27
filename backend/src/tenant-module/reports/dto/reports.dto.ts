import { IsOptional, IsIn, IsUUID, IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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
