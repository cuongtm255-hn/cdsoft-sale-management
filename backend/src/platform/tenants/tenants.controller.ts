import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { TenantsService } from './tenants.service';
import { CreateTenantDto, UpdateTenantDto, UpdateTenantStatusDto } from './dto/create-tenant.dto';

@ApiTags('Platform / Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('platform/tenants')
export class TenantsController {
  constructor(private readonly service: TenantsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'PLATFORM_OPERATOR')
  @ApiOperation({ summary: 'List all tenants' })
  findAll(@Query() pagination: PaginationDto) {
    return this.service.findAll(pagination);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'PLATFORM_OPERATOR')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Create and provision new tenant' })
  create(@Body() dto: CreateTenantDto, @CurrentUser() user: { id: string }) {
    return this.service.create(dto, user.id);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  @Roles('SUPER_ADMIN')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTenantStatusDto) {
    return this.service.updateStatus(id, dto);
  }
}
