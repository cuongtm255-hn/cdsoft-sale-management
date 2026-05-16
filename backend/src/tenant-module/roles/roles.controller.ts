import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { RequirePermission } from '@common/decorators/permission.decorator';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRolePermissionsDto } from './dto/roles.dto';

@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('tenant/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission('roles:read')
  list() {
    return this.rolesService.listRoles();
  }

  @Get('permissions')
  @RequirePermission('roles:read')
  listPermissions() {
    return this.rolesService.listPermissions();
  }

  @Post()
  @RequirePermission('roles:write')
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(dto);
  }

  @Put(':id/permissions')
  @RequirePermission('roles:write')
  updatePermissions(@Param('id') id: string, @Body() dto: UpdateRolePermissionsDto) {
    return this.rolesService.updatePermissions(id, dto);
  }
}
