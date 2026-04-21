import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty() @IsString() @Length(2, 50) tenantCode: string;
  @ApiProperty() @IsString() @Length(2, 100) tenantName: string;
  @ApiProperty() @IsString() @Length(2, 150) companyName: string;
  @ApiProperty() @IsString() contactName: string;
  @ApiProperty() @IsEmail() contactEmail: string;
  @ApiPropertyOptional() @IsString() @IsOptional() contactPhone?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() address?: string;
  @ApiPropertyOptional({ default: 'localhost' }) @IsString() @IsOptional() dbHost?: string;
  @ApiPropertyOptional({ default: 3306 }) @IsInt() @Min(1) @Max(65535) @IsOptional() dbPort?: number;
}

export class UpdateTenantDto {
  @ApiPropertyOptional() @IsString() @IsOptional() tenantName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() companyName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() contactName?: string;
  @ApiPropertyOptional() @IsEmail() @IsOptional() contactEmail?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() contactPhone?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() address?: string;
}

export class UpdateTenantStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] })
  @IsString()
  status: string;
}
