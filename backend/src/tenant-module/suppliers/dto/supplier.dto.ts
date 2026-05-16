import { Type, Transform } from 'class-transformer';
import {
  IsBoolean, IsEmail, IsInt, IsOptional, IsString, Min, MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class AddressDto {
  @IsOptional() @IsString() street?: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() city?: string;
}

export class BankAccountDto {
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() accountNumber?: string;
  @IsOptional() @IsString() accountName?: string;
  @IsOptional() @IsString() branch?: string;
}

export class CreateSupplierDto {
  @IsOptional() @IsString() code?: string;

  @IsString() @MinLength(2) name: string;

  @IsOptional() @IsString() taxCode?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() contactPerson?: string;

  @IsOptional() @IsInt() @Min(0) paymentTermDays?: number;
  @IsOptional() @IsString() discountTerms?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BankAccountDto)
  bankAccounts?: BankAccountDto[];

  @IsOptional() @IsBoolean() isCustomer?: boolean;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateSupplierDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() taxCode?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() contactPerson?: string;
  @IsOptional() @IsInt() @Min(0) paymentTermDays?: number;
  @IsOptional() @IsString() discountTerms?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BankAccountDto)
  bankAccounts?: BankAccountDto[];

  @IsOptional() @IsBoolean() isCustomer?: boolean;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class SupplierFilterDto extends PaginationDto {
  @IsOptional() @IsString() search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;
}
