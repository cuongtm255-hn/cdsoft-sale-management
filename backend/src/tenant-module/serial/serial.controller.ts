import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { RequirePermission } from '@common/decorators/permission.decorator';
import { SerialService } from './serial.service';
import { SerialQueryDto } from './dto/serial.dto';
import { PaginationDto } from '@common/dto/pagination.dto';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('tenant/serial')
export class SerialController {
  constructor(private readonly serialService: SerialService) {}

  @Get('warranty-lookup')
  @RequirePermission('inventory:read')
  warrantyLookup(@Query('serial') serial: string) {
    return this.serialService.warrantyLookup(serial);
  }

  @Get('in-stock')
  @RequirePermission('inventory:read')
  listInStock(@Query() dto: SerialQueryDto) {
    return this.serialService.listByStatus('IN_STOCK', dto);
  }

  @Get(':productId')
  @RequirePermission('inventory:read')
  listByProduct(@Param('productId') productId: string, @Query() dto: PaginationDto) {
    return this.serialService.listByProduct(productId, dto);
  }
}
