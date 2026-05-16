import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

export class PlatformLoginDto {
  @ApiProperty({ example: 'superadmin@platform.com' })
  @Matches(/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/, { message: 'email must be a valid email address' })
  email: string;

  @ApiProperty({ example: 'Admin@12345!' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class AuthTokenDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken?: string;
  @ApiProperty() expiresIn: number;
}
