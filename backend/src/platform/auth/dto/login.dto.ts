import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class PlatformLoginDto {
  @ApiProperty({ example: 'superadmin@platform.com' })
  @IsEmail()
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
