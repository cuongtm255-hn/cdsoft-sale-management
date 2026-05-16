import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UsersService } from './users.service';
import { CreatePlatformUserDto, UpdatePlatformUserDto } from './dto/user.dto';

@ApiTags('Platform / Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('platform/users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get() findAll(@Query() pagination: PaginationDto) { return this.service.findAll(pagination); }
  @Post() create(@Body() dto: CreatePlatformUserDto) { return this.service.create(dto); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdatePlatformUserDto) { return this.service.update(id, dto); }
  @Patch(':id/lock') toggleLock(@Param('id') id: string) { return this.service.toggleLock(id); }
}
