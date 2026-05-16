import { Type } from 'class-transformer';
import {
  IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional,
  IsString, IsUUID, Min, ValidateNested, IsDateString,
} from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

// ─── Invoice Filter ───────────────────────────────────────────────────────────

export class InvoiceFilterDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Number) page?: number;
  @IsOptional() @Type(() => Number) limit?: number;
}

export class PurchaseInvoiceFilterDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsUUID() supplierId?: string;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Number) page?: number;
  @IsOptional() @Type(() => Number) limit?: number;
}

// ─── Record Payment ───────────────────────────────────────────────────────────

export class RecordPaymentDto {
  @IsUUID() invoiceId: string;
  @IsNumber() @Min(0.01) amount: number;
  @IsEnum(PaymentMethod) method: PaymentMethod;
  @IsOptional() @IsUUID() cashFundId?: string;
  @IsOptional() @IsUUID() bankAccountId?: string;
  @IsOptional() @IsString() transactionRef?: string;
  @IsOptional() @IsDateString() paidAt?: string;
  @IsOptional() @IsString() notes?: string;
}

export class RecordPayablePaymentDto {
  @IsUUID() purchaseInvoiceId: string;
  @IsNumber() @Min(0.01) amount: number;
  @IsEnum(PaymentMethod) method: PaymentMethod;
  @IsOptional() @IsUUID() cashFundId?: string;
  @IsOptional() @IsUUID() bankAccountId?: string;
  @IsOptional() @IsString() transactionRef?: string;
  @IsOptional() @IsDateString() paidAt?: string;
  @IsOptional() @IsString() notes?: string;
}

// ─── AR Match ─────────────────────────────────────────────────────────────────

export class ArMatchItemDto {
  @IsUUID() invoiceId: string;
  @IsNumber() @Min(0.01) amount: number;
}

export class ArMatchDto {
  @IsUUID() paymentId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArMatchItemDto)
  matches: ArMatchItemDto[];
}

// ─── AP / Cash Management ─────────────────────────────────────────────────────

export class ApFilterDto {
  @IsOptional() @Type(() => Number) daysAhead?: number;
  @IsOptional() @IsUUID() supplierId?: string;
}

export class ArAgingFilterDto {
  @IsOptional() @IsString() asOfDate?: string;
  @IsOptional() @IsUUID() customerId?: string;
}

export class CreateCashFundDto {
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsNumber() @Type(() => Number) balance?: number;
  @IsOptional() @IsString() currency?: string;
}

export class UpdateCashFundDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() isActive?: boolean;
}

export class CreateBankAccountDto {
  @IsString() @IsNotEmpty() bankName: string;
  @IsString() @IsNotEmpty() accountNumber: string;
  @IsString() @IsNotEmpty() accountName: string;
  @IsOptional() @IsNumber() @Type(() => Number) balance?: number;
  @IsOptional() @IsString() currency?: string;
}

export class UpdateBankAccountDto {
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() accountNumber?: string;
  @IsOptional() @IsString() accountName?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() isActive?: boolean;
}

export class CreateManualReceiptDto {
  @IsString() @IsNotEmpty() kind: string;
  @IsString() @IsNotEmpty() receiptType: string;
  @IsNumber() @Min(0.01) amount: number;
  @IsOptional() @IsUUID() cashFundId?: string;
  @IsOptional() @IsUUID() bankAccountId?: string;
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsUUID() supplierId?: string;
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() requiresApproval?: boolean;
}

export class UpdateManualReceiptDto {
  @IsOptional() @IsString() receiptType?: string;
  @IsOptional() @IsNumber() @Min(0.01) @Type(() => Number) amount?: number;
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsUUID() cashFundId?: string;
  @IsOptional() @IsUUID() bankAccountId?: string;
  @IsOptional() @IsString() description?: string;
}
