import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDisbursementDto {
  @IsEnum(['SUPPLIER_PAYMENT', 'SALARY', 'OVERHEAD', 'OTHER'])
  disbursementType: string;

  @IsOptional() @IsUUID() supplierId?: string;
  @IsOptional() @IsUUID() apRecordId?: string;
  @IsOptional() @IsUUID() cashFundId?: string;
  @IsOptional() @IsUUID() bankAccountId?: string;

  @IsNumber() @Min(0.01) @Type(() => Number)
  amount: number;

  @IsOptional() @IsString() description?: string;

  @IsOptional() @IsBoolean() requiresApproval?: boolean;
}

export class RejectDisbursementDto {
  @IsString() reason: string;
}
