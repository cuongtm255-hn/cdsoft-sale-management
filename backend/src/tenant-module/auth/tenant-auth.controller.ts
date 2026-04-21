import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { TenantAuthService } from './tenant-auth.service';
import { TenantLoginDto } from './dto/tenant-login.dto';

@ApiTags('Tenant Auth')
@Controller('tenant/auth')
export class TenantAuthController {
  constructor(private readonly service: TenantAuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: TenantLoginDto) {
    return this.service.login(dto);
  }
}
