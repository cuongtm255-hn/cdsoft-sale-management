import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';

export class SerialQueryDto extends PaginationDto {
  @IsOptional() @IsUUID()   productId?: string;
  @IsOptional() @IsString() status?: string;
}
