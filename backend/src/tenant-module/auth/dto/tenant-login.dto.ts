import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class TenantLoginDto {
  @ApiProperty() @Matches(/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/, { message: 'email must be a valid email address' }) email: string;
  @ApiProperty() @IsString() password: string;
  @ApiProperty() @IsString() @Length(2, 50) tenantCode: string;
}
