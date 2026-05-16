import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { PlatformRole } from '../entities/platform-user.entity';

export class CreatePlatformUserDto {
  @ApiProperty() @IsString() username: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ minLength: 10 }) @IsString() @MinLength(10) password: string;
  @ApiProperty({ enum: PlatformRole }) @IsEnum(PlatformRole) role: PlatformRole;
}

export class UpdatePlatformUserDto {
  @ApiPropertyOptional() @IsString() @IsOptional() username?: string;
  @ApiPropertyOptional() @IsEmail() @IsOptional() email?: string;
  @ApiPropertyOptional({ enum: PlatformRole }) @IsEnum(PlatformRole) @IsOptional() role?: PlatformRole;
}
