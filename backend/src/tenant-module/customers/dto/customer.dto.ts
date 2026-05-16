import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsBoolean, IsEmail, IsEnum, IsNumber, IsOptional, IsString,
  IsUUID, Length, Min, ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { CustomerGroup } from '../entities/customer.entity';

export class AddressDto {
  @ApiPropertyOptional() @IsString() @IsOptional() street?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() district?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() city?: string;
}

export class CreateCustomerDto {
  @ApiPropertyOptional() @IsString() @IsOptional() code?: string;
  @ApiProperty() @IsString() @Length(2, 255) name: string;
  @ApiPropertyOptional() @IsString() @IsOptional() taxCode?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
  @ApiPropertyOptional() @IsEmail() @IsOptional() email?: string;
  @ApiPropertyOptional({ enum: CustomerGroup }) @IsEnum(CustomerGroup) @IsOptional() group?: CustomerGroup;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() creditLimit?: number;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() paymentTermDays?: number;
  @ApiPropertyOptional() @IsUUID() @IsOptional() salesRepId?: string;
  @ApiPropertyOptional({ type: AddressDto })
  @ValidateNested() @Type(() => AddressDto) @IsOptional() address?: AddressDto;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional() @IsString() @Length(2, 255) @IsOptional() name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() taxCode?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
  @ApiPropertyOptional() @IsEmail() @IsOptional() email?: string;
  @ApiPropertyOptional({ enum: CustomerGroup }) @IsEnum(CustomerGroup) @IsOptional() group?: CustomerGroup;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() creditLimit?: number;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() paymentTermDays?: number;
  @ApiPropertyOptional() @IsUUID() @IsOptional() salesRepId?: string;
  @ApiPropertyOptional({ type: AddressDto })
  @ValidateNested() @Type(() => AddressDto) @IsOptional() address?: AddressDto;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isActive?: boolean;
}

export class CustomerFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: CustomerGroup }) @IsString() @IsOptional() group?: string;
  @ApiPropertyOptional()
  @IsBoolean() @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  isActive?: boolean;
  @ApiPropertyOptional() @IsUUID() @IsOptional() salesRepId?: string;
}

export class TransactionFilterDto extends PaginationDto {
  @ApiPropertyOptional() @IsString() @IsOptional() type?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() from?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() to?: string;
}
