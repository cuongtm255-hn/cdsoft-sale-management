import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty() @IsString() @Length(1, 255) name: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() parentId?: string;
  @ApiPropertyOptional() @IsOptional() sortOrder?: number;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional() @IsString() @Length(1, 255) @IsOptional() name?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional() @IsUUID() @IsOptional() parentId?: string;
  @ApiPropertyOptional() @IsOptional() sortOrder?: number;
}
