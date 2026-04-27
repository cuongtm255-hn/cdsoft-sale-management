import { Type, Transform } from 'class-transformer';
import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNotEmpty,
  IsNumber, IsOptional, IsString, IsUUID, Min, MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

// ─── Warehouse ───────────────────────────────────────────────────────────────

export class CreateWarehouseDto {
  @IsString() @MinLength(2) name: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateWarehouseDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// ─── Stock In ────────────────────────────────────────────────────────────────

export class StockReceiptItemDto {
  @IsUUID() productId: string;
  @IsOptional() @IsUUID() unitId?: string;
  @IsNumber() @Min(0.0001) quantity: number;
  @IsNumber() @Min(0) unitCost: number;
  @IsOptional() @IsString() batchNumber?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
}

export class CreateStockReceiptDto {
  @IsOptional() @IsUUID() supplierId?: string;
  @IsUUID() warehouseId: string;
  @IsOptional() @IsDateString() expectedDate?: string;
  @IsOptional() @IsString() refCode?: string;
  @IsOptional() @IsString() notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockReceiptItemDto)
  items: StockReceiptItemDto[];
}

export class ConfirmReceiptItemDto {
  @IsUUID() id: string;
  @IsOptional() @IsNumber() @Min(0.0001) quantity?: number;
  @IsOptional() @IsNumber() @Min(0) unitCost?: number;
}

export class ConfirmStockReceiptDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmReceiptItemDto)
  items?: ConfirmReceiptItemDto[];
}

// ─── Stock Out ───────────────────────────────────────────────────────────────

export class StockOutItemDto {
  @IsUUID() productId: string;
  @IsOptional() @IsUUID() unitId?: string;
  @IsNumber() @Min(0.0001) quantity: number;
}

export class CreateStockOutDto {
  @IsUUID() warehouseId: string;
  @IsString() issueType: string; // SALE | INTERNAL | DAMAGED | TRANSFER_OUT
  @IsOptional() @IsUUID() orderId?: string;
  @IsOptional() @IsString() notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StockOutItemDto)
  items: StockOutItemDto[];
}

// ─── Adjustment ──────────────────────────────────────────────────────────────

export class AdjustmentItemDto {
  @IsUUID() productId: string;
  @IsOptional() @IsUUID() unitId?: string;
  @IsNumber() @Min(0) systemQty: number;
  @IsNumber() @Min(0) actualQty: number;
}

export class CreateAdjustmentDto {
  @IsUUID() warehouseId: string;
  @IsString() @IsNotEmpty() reason: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdjustmentItemDto)
  items: AdjustmentItemDto[];
}

// ─── Transfer ────────────────────────────────────────────────────────────────

export class TransferItemDto {
  @IsUUID() productId: string;
  @IsOptional() @IsUUID() unitId?: string;
  @IsNumber() @Min(0.0001) quantity: number;
}

export class CreateTransferDto {
  @IsUUID() fromWarehouseId: string;
  @IsUUID() toWarehouseId: string;
  @IsOptional() @IsDateString() expectedDate?: string;
  @IsOptional() @IsString() notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items: TransferItemDto[];
}

export class ReceiveTransferItemDto {
  @IsUUID() productId: string;
  @IsNumber() @Min(0) receivedQty: number;
}

export class ReceiveTransferDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveTransferItemDto)
  items?: ReceiveTransferItemDto[];
}

// ─── Stocktaking ─────────────────────────────────────────────────────────────

export class CreateStocktakingDto {
  @IsUUID() warehouseId: string;
  @IsOptional() @IsString() notes?: string;
}

export class StocktakingItemDto {
  @IsUUID() productId: string;
  @IsNumber() @Min(0) actualQty: number;
}

export class CompleteStocktakingDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StocktakingItemDto)
  items: StocktakingItemDto[];
}

// ─── Transactions / Balance view ─────────────────────────────────────────────

export class StockReceiptFilterDto extends PaginationDto {
  @IsOptional() @IsUUID() warehouseId?: string;
}

export class StockOutFilterDto extends PaginationDto {
  @IsOptional() @IsUUID() warehouseId?: string;
}

export class InventoryFilterDto extends PaginationDto {
  @IsOptional() @IsUUID() warehouseId?: string;
  @IsOptional() @IsUUID() productId?: string;
  @IsOptional() @IsUUID() categoryId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  lowStockOnly?: boolean;
}
