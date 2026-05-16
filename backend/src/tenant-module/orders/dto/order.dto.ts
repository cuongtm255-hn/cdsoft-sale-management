import { Type } from 'class-transformer';
import {
  IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional,
  IsString, IsUUID, Min, ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../entities/order.entity';
import { RefundMethod } from '../entities/return-order.entity';
import { PromotionType, Promotion } from '../entities/promotion.entity';

// ─── Order Filter ─────────────────────────────────────────────────────────────

export class OrderFilterDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() salesRepId?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Number) page?: number;
  @IsOptional() @Type(() => Number) limit?: number;
}

// ─── Order Item ───────────────────────────────────────────────────────────────

export class CreateOrderItemDto {
  @IsUUID() productId: string;
  @IsOptional() @IsUUID() unitId?: string;
  @IsNumber() @Min(0.0001) quantity: number;
  @IsNumber() @Min(0) unitPrice: number;
  @IsOptional() @IsNumber() @Min(0) discountPercent?: number;
  @IsOptional() @IsNumber() @Min(0) discountAmount?: number;
}

// ─── Sales Order ──────────────────────────────────────────────────────────────

export class CreateSalesOrderDto {
  @IsUUID() customerId: string;
  @IsOptional() @IsUUID() warehouseId?: string;
  @IsOptional() @IsUUID() salesRepId?: string;
  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @IsOptional() @IsString() shippingAddress?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() voucherCode?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}

export class CancelOrderDto {
  @IsString() @IsNotEmpty() reason: string;
}

// ─── Purchase Order ───────────────────────────────────────────────────────────

export class CreatePurchaseOrderDto {
  @IsOptional() @IsUUID() supplierId?: string;
  @IsOptional() @IsUUID() warehouseId?: string;
  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @IsOptional() @IsString() notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}

// ─── Voucher ──────────────────────────────────────────────────────────────────

export class ValidateVoucherDto {
  @IsString() @IsNotEmpty() code: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsNumber() @Min(0) orderTotal: number;
}

export class CreateVoucherDto {
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() name: string;
  @IsString() type: string;
  @IsNumber() @Min(0) value: number;
  @IsOptional() @IsNumber() maxDiscount?: number;
  @IsOptional() @IsNumber() minOrderAmount?: number;
  @IsOptional() @IsNumber() usageLimit?: number;
  @IsOptional() @IsNumber() perCustomerLimit?: number;
  @IsOptional() @IsString() customerGroup?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
}

// ─── Promotion ────────────────────────────────────────────────────────────────

export class CreatePromotionDto {
  @IsString() @IsNotEmpty() name: string;
  @IsEnum(PromotionType) type: PromotionType;
  @IsOptional() condition?: Record<string, unknown>;
  @IsOptional() discount?: Record<string, unknown>;
  @IsOptional() reward?: Record<string, unknown>;
  @IsOptional() items?: Record<string, unknown>[];
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsNumber() priority?: number;
  @IsOptional() stackable?: boolean;
  @IsOptional() @IsString() notes?: string;
}

// ─── Return Order ─────────────────────────────────────────────────────────────

export class ReturnOrderItemDto {
  @IsUUID() orderItemId: string;
  @IsNumber() @Min(0.0001) returnQty: number;
  @IsOptional() @IsUUID() returnUnitId?: string;
}

export class CreateReturnOrderDto {
  @IsUUID() originalOrderId: string;
  @IsString() @IsNotEmpty() reason: string;
  @IsEnum(RefundMethod) refundMethod: RefundMethod;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnOrderItemDto)
  items: ReturnOrderItemDto[];
}
