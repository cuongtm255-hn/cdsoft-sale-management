import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantAuthService } from './tenant-auth.service';
import { TenantLoginDto } from './dto/tenant-login.dto';
import { ChangePasswordDto } from '../users/dto/user.dto';
import { RolesService } from '../roles/roles.service';

@ApiTags('Tenant Auth')
@Controller('tenant/auth')
export class TenantAuthController {
  constructor(
    private readonly service: TenantAuthService,
    private readonly rolesService: RolesService,
  ) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Tenant user login' })
  login(@Body() dto: TenantLoginDto) {
    return this.service.login(dto);
  }

  @Get('permissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user permissions' })
  async getPermissions(@CurrentUser() user: { role: string }) {
    return this.rolesService.getPermissionsForRole(user.role);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current user password' })
  changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.changePassword(user.id, dto);
  }
}
