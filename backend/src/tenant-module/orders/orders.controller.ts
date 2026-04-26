import {
  Body, Controller, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import {
  OrderFilterDto,
  CreateSalesOrderDto,
  CreatePurchaseOrderDto,
  CancelOrderDto,
  ValidateVoucherDto,
  CreateVoucherDto,
  CreatePromotionDto,
  CreateReturnOrderDto,
} from './dto/order.dto';

@ApiTags('Tenant / Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  // ─── Sales Orders ─────────────────────────────────────────────────────────

  @Get('tenant/sales-orders')
  @ApiOperation({ summary: 'List sales orders' })
  listSalesOrders(
    @Query() filter: OrderFilterDto,
    @CurrentUser() user: any,
  ) {
    return this.service.listSalesOrders(filter, user.sub);
  }

  @Post('tenant/sales-orders')
  @ApiOperation({ summary: 'Create sales order' })
  createSalesOrder(
    @Body() dto: CreateSalesOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.service.createSalesOrder(dto, user.sub);
  }

  @Get('tenant/sales-orders/:id')
  @ApiOperation({ summary: 'Get sales order detail' })
  getSalesOrder(@Param('id') id: string) {
    return this.service.getOrder(id);
  }

  @Patch('tenant/sales-orders/:id/confirm')
  @ApiOperation({ summary: 'Confirm sales order' })
  confirmSalesOrder(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.service.confirmSalesOrder(id, user.sub);
  }

  @Patch('tenant/sales-orders/:id/ship')
  @ApiOperation({ summary: 'Mark sales order as delivering' })
  shipSalesOrder(@Param('id') id: string) {
    return this.service.shipSalesOrder(id);
  }

  @Patch('tenant/sales-orders/:id/complete')
  @ApiOperation({ summary: 'Mark sales order as delivered' })
  completeSalesOrder(@Param('id') id: string) {
    return this.service.completeSalesOrder(id);
  }

  @Patch('tenant/sales-orders/:id/cancel')
  @ApiOperation({ summary: 'Cancel order' })
  cancelSalesOrder(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.service.cancelOrder(id, dto);
  }

  // ─── Purchase Orders ──────────────────────────────────────────────────────

  @Get('tenant/purchase-orders')
  @ApiOperation({ summary: 'List purchase orders' })
  listPurchaseOrders(@Query() filter: OrderFilterDto) {
    return this.service.listPurchaseOrders(filter);
  }

  @Post('tenant/purchase-orders')
  @ApiOperation({ summary: 'Create purchase order' })
  createPurchaseOrder(@Body() dto: CreatePurchaseOrderDto) {
    return this.service.createPurchaseOrder(dto);
  }

  @Get('tenant/purchase-orders/:id')
  @ApiOperation({ summary: 'Get purchase order detail' })
  getPurchaseOrder(@Param('id') id: string) {
    return this.service.getOrder(id);
  }

  @Patch('tenant/purchase-orders/:id/confirm')
  @ApiOperation({ summary: 'Confirm purchase order' })
  confirmPurchaseOrder(@Param('id') id: string) {
    return this.service.confirmPurchaseOrder(id);
  }

  @Patch('tenant/purchase-orders/:id/receive')
  @ApiOperation({ summary: 'Receive purchase order (update stock)' })
  receivePurchaseOrder(@Param('id') id: string) {
    return this.service.receivePurchaseOrder(id);
  }

  @Patch('tenant/purchase-orders/:id/cancel')
  @ApiOperation({ summary: 'Cancel purchase order' })
  cancelPurchaseOrder(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.service.cancelOrder(id, dto);
  }

  // ─── Returns ──────────────────────────────────────────────────────────────

  @Post('tenant/returns')
  @ApiOperation({ summary: 'Create return order' })
  createReturn(
    @Body() dto: CreateReturnOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.service.createReturn(dto, user.sub);
  }

  // ─── Vouchers ─────────────────────────────────────────────────────────────

  @Get('tenant/vouchers')
  @ApiOperation({ summary: 'List vouchers' })
  listVouchers() {
    return this.service.listVouchers();
  }

  @Post('tenant/vouchers')
  @ApiOperation({ summary: 'Create voucher' })
  createVoucher(@Body() dto: CreateVoucherDto) {
    return this.service.createVoucher(dto);
  }

  @Post('tenant/vouchers/validate')
  @ApiOperation({ summary: 'Validate voucher code' })
  validateVoucher(@Body() dto: ValidateVoucherDto) {
    return this.service.validateVoucher(dto);
  }

  // ─── Promotions ───────────────────────────────────────────────────────────

  @Get('tenant/promotions')
  @ApiOperation({ summary: 'List promotions' })
  listPromotions(@Query('status') status?: string) {
    return this.service.listPromotions(status);
  }

  @Post('tenant/promotions')
  @ApiOperation({ summary: 'Create promotion' })
  createPromotion(@Body() dto: CreatePromotionDto) {
    return this.service.createPromotion(dto);
  }

  @Patch('tenant/promotions/:id')
  @ApiOperation({ summary: 'Update promotion' })
  updatePromotion(
    @Param('id') id: string,
    @Body() dto: Partial<CreatePromotionDto>,
  ) {
    return this.service.updatePromotion(id, dto);
  }
}
