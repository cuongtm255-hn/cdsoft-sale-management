import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty() success: boolean;
  @ApiProperty() message: string;
  @ApiProperty() data: T;
  @ApiProperty() timestamp: string;

  static ok<T>(data: T, message = 'Success'): ApiResponseDto<T> {
    return { success: true, message, data, timestamp: new Date().toISOString() };
  }

  static fail(message: string): ApiResponseDto<null> {
    return { success: false, message, data: null, timestamp: new Date().toISOString() };
  }
}

export class PaginatedResponseDto<T> {
  @ApiProperty() data: T[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
