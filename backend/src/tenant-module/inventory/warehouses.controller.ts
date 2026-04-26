import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { InventoryService } from './inventory.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/inventory.dto';

@ApiTags('Tenant / Warehouses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenant/warehouses')
export class WarehousesController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'List active warehouses' })
  list() {
    return this.service.listWarehouses();
  }

  @Post()
  @ApiOperation({ summary: 'Create warehouse' })
  create(@Body() dto: CreateWarehouseDto) {
    return this.service.createWarehouse(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update warehouse' })
  update(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.service.updateWarehouse(id, dto);
  }
}
