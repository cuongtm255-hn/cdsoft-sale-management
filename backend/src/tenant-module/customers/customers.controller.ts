import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CustomersService } from './customers.service';
import {
  CreateCustomerDto, UpdateCustomerDto, CustomerFilterDto, TransactionFilterDto,
} from './dto/customer.dto';

@ApiTags('Tenant / Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenant/customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'List customers with filters' })
  findAll(@Query() filter: CustomerFilterDto) {
    return this.service.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer detail' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create customer' })
  create(
    @Body() dto: CreateCustomerDto,
    @CurrentUser() user: { role: string },
  ) {
    return this.service.create(dto, user.role);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update customer' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: { role: string },
  ) {
    return this.service.update(id, dto, user.role);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Get customer transaction history' })
  getTransactions(
    @Param('id') id: string,
    @Query() filter: TransactionFilterDto,
  ) {
    return this.service.getTransactions(id, filter);
  }
}
