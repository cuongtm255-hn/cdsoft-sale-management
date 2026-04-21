import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty() @IsString() sku: string;
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiProperty() @IsNumber() @Min(0) costPrice: number;
  @ApiProperty() @IsNumber() @Min(0) sellingPrice: number;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() minStockLevel?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() unit?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() categoryId?: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional() @IsString() @IsOptional() name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() costPrice?: number;
  @ApiPropertyOptional() @IsNumber() @Min(0) @IsOptional() sellingPrice?: number;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isActive?: boolean;
}
