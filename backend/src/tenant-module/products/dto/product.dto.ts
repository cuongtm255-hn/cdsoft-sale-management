import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID,
  Length, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { PriceType } from '../entities/product-price.entity';

export class ProductUnitDto {
  @ApiProperty() @IsString() @Length(1, 50) name: string;
  @ApiProperty() @IsNumber() @Min(0.0001) conversionRate: number;
  @ApiPropertyOptional() @IsString() @MaxLength(100) @IsOptional() barcode?: string;
}

export class ProductPriceDto {
  @ApiProperty({ enum: PriceType }) @IsEnum(PriceType) priceType: PriceType;
  @ApiProperty() @IsNumber() @Min(0) amount: number;
  @ApiPropertyOptional() @IsString() @IsOptional() unitId?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() currency?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() effectiveFrom?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() effectiveTo?: string;
}

export class CreateProductDto {
  @ApiProperty() @IsString() @Length(1, 100) sku: string;
  @ApiPropertyOptional() @IsString() @MaxLength(100) @IsOptional() barcode?: string;
  @ApiProperty() @IsString() @Length(2, 255) name: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() categoryId?: string;
  @ApiPropertyOptional() @IsString() @MaxLength(100) @IsOptional() brand?: string;
  @ApiPropertyOptional() @IsString() @MaxLength(50) @IsOptional() baseUnit?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() defaultWarehouseId?: string;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() minStockLevel?: number;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() maxStockLevel?: number;
  @ApiPropertyOptional({ type: [ProductUnitDto] })
  @ValidateNested({ each: true }) @Type(() => ProductUnitDto) @IsOptional()
  units?: ProductUnitDto[];
  @ApiPropertyOptional({ type: [ProductPriceDto] })
  @ValidateNested({ each: true }) @Type(() => ProductPriceDto) @IsOptional()
  prices?: ProductPriceDto[];
}

export class UpdateProductDto {
  @ApiPropertyOptional() @IsString() @MaxLength(100) @IsOptional() barcode?: string;
  @ApiPropertyOptional() @IsString() @Length(2, 255) @IsOptional() name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() categoryId?: string;
  @ApiPropertyOptional() @IsString() @MaxLength(100) @IsOptional() brand?: string;
  @ApiPropertyOptional() @IsString() @MaxLength(50) @IsOptional() baseUnit?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() defaultWarehouseId?: string;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() minStockLevel?: number;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() maxStockLevel?: number;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isActive?: boolean;
  @ApiPropertyOptional({ type: [ProductUnitDto] })
  @ValidateNested({ each: true }) @Type(() => ProductUnitDto) @IsOptional()
  units?: ProductUnitDto[];
  @ApiPropertyOptional({ type: [ProductPriceDto] })
  @ValidateNested({ each: true }) @Type(() => ProductPriceDto) @IsOptional()
  prices?: ProductPriceDto[];
}

export class ProductFilterDto extends PaginationDto {
  @ApiPropertyOptional() @IsUUID() @IsOptional() categoryId?: string;
  @ApiPropertyOptional()
  @IsBoolean() @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  isActive?: boolean;
  @ApiPropertyOptional()
  @IsBoolean() @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  hasLowStock?: boolean;
}
