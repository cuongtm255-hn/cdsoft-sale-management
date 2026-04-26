import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber,
  IsOptional, IsString, IsUUID, Min, ValidateNested,
} from 'class-validator';
import { LoyaltyTxType } from '../entities/loyalty-transaction.entity';

// ─── Tier ─────────────────────────────────────────────────────────────────────

export class LoyaltyTierDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() label: string;
  @IsNumber() @Min(0) minPoints: number;
  @IsNumber() @Min(0) discountPercent: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

export class UpdateLoyaltyConfigDto {
  @IsOptional() @IsBoolean() isEnabled?: boolean;
  @IsOptional() @IsNumber() @Min(1) pointsPerAmount?: number;
  @IsOptional() @IsNumber() @Min(1) amountPerPoint?: number;
  @IsOptional() @IsString() currencyUnit?: string;
  @IsOptional() @IsInt() @Min(1) tierEvaluationPeriodDays?: number;
  @IsOptional() @IsInt() @Min(1) pointExpiryDays?: number;
  @IsOptional() @IsBoolean() allowTierDowngrade?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoyaltyTierDto)
  tiers?: LoyaltyTierDto[];
}

// ─── Redeem Preview ───────────────────────────────────────────────────────────

export class RedeemPreviewDto {
  @IsUUID() customerId: string;
  @IsInt() @Min(1) pointsToRedeem: number;
}

// ─── Earn Points (manual) ─────────────────────────────────────────────────────

export class EarnPointsDto {
  @IsUUID() customerId: string;
  @IsInt() @Min(1) points: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() refType?: string;
  @IsOptional() @IsString() refId?: string;
}

// ─── Adjust Points ────────────────────────────────────────────────────────────

export class AdjustPointsDto {
  @IsUUID() customerId: string;
  @IsInt() points: number;
  @IsString() @IsNotEmpty() description: string;
}

// ─── Transaction Filter ───────────────────────────────────────────────────────

export class LoyaltyTxFilterDto {
  @IsOptional() @IsUUID() customerId?: string;
  @IsOptional() @IsEnum(LoyaltyTxType) type?: LoyaltyTxType;
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
  @IsOptional() @Type(() => Number) page?: number;
  @IsOptional() @Type(() => Number) limit?: number;
}
