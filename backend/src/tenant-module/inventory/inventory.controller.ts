import {
  Body, Controller, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InventoryService } from './inventory.service';
import {
  CreateStockReceiptDto, ConfirmStockReceiptDto,
  CreateStockOutDto, CreateAdjustmentDto,
  CreateTransferDto, ReceiveTransferDto,
  CreateStocktakingDto, CompleteStocktakingDto,
  InventoryFilterDto, StockReceiptFilterDto, StockOutFilterDto,
} from './dto/inventory.dto';

@ApiTags('Tenant / Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenant/inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  // ─── Stock overview ───────────────────────────────────────────────────────

  @Get('transactions')
  @ApiOperation({ summary: 'Get inventory balance / stock overview' })
  getInventory(@Query() filter: InventoryFilterDto) {
    return this.service.getInventory(filter);
  }

  @Get('product-stock')
  @ApiOperation({ summary: 'Get stock for a specific product + warehouse' })
  getProductStock(
    @Query('productId') productId: string,
    @Query('warehouseId') warehouseId: string,
  ) {
    return this.service.getProductStock(productId, warehouseId);
  }

  @Get('product-transactions')
  @ApiOperation({ summary: 'Get transaction history for a product' })
  getProductTransactions(
    @Query('productId') productId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.service.getInventoryTransactions(productId, warehouseId);
  }

  // ─── Stock In / Receipts ──────────────────────────────────────────────────

  @Get('stock-receipts')
  @ApiOperation({ summary: 'List stock receipts' })
  getReceipts(@Query() filter: StockReceiptFilterDto) {
    return this.service.getReceipts(filter);
  }

  @Get('stock-receipts/:id')
  @ApiOperation({ summary: 'Get stock receipt detail' })
  getReceipt(@Param('id') id: string) {
    return this.service.getReceipt(id);
  }

  @Post('stock-in')
  @ApiOperation({ summary: 'Create stock receipt (DRAFT)' })
  stockIn(
    @Body() dto: CreateStockReceiptDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.createReceipt(dto, user.id);
  }

  @Patch('stock-receipts/:id/confirm')
  @ApiOperation({ summary: 'Confirm stock receipt — updates inventory balances' })
  confirmReceipt(
    @Param('id') id: string,
    @Body() dto: ConfirmStockReceiptDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.confirmReceipt(id, dto, user.id);
  }

  @Patch('stock-receipts/:id/cancel')
  @ApiOperation({ summary: 'Cancel stock receipt' })
  cancelReceipt(@Param('id') id: string) {
    return this.service.cancelReceipt(id);
  }

  // ─── Stock Out ────────────────────────────────────────────────────────────

  @Get('stock-out')
  @ApiOperation({ summary: 'List stock issues' })
  getStockOuts(@Query() filter: StockOutFilterDto) {
    return this.service.getStockOuts(filter);
  }

  @Post('stock-out')
  @ApiOperation({ summary: 'Create stock issue' })
  stockOut(
    @Body() dto: CreateStockOutDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.stockOut(dto, user.id);
  }

  // ─── Adjustment ───────────────────────────────────────────────────────────

  @Post('adjust')
  @ApiOperation({ summary: 'Create stock adjustment' })
  adjust(
    @Body() dto: CreateAdjustmentDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.adjust(dto, user.id);
  }

  // ─── Transfers ────────────────────────────────────────────────────────────

  @Get('transfers')
  @ApiOperation({ summary: 'List stock transfers' })
  getTransfers() {
    return this.service.getTransfers();
  }

  @Get('transfers/:id')
  @ApiOperation({ summary: 'Get stock transfer detail' })
  getTransfer(@Param('id') id: string) {
    return this.service.getTransfer(id);
  }

  @Post('transfers')
  @ApiOperation({ summary: 'Create stock transfer order' })
  createTransfer(
    @Body() dto: CreateTransferDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.createTransfer(dto, user.id);
  }

  @Patch('transfers/:id/dispatch')
  @ApiOperation({ summary: 'Dispatch transfer — deducts from source warehouse' })
  dispatchTransfer(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.dispatchTransfer(id, user.id);
  }

  @Patch('transfers/:id/receive')
  @ApiOperation({ summary: 'Confirm receipt at destination warehouse' })
  receiveTransfer(
    @Param('id') id: string,
    @Body() dto: ReceiveTransferDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.receiveTransfer(id, dto, user.id);
  }

  // ─── Stocktaking ──────────────────────────────────────────────────────────

  @Get('stocktaking')
  @ApiOperation({ summary: 'List stocktaking sessions' })
  getStocktakings(@Query('warehouseId') warehouseId?: string) {
    return this.service.getStocktakings(warehouseId);
  }

  @Get('stocktaking/:id')
  @ApiOperation({ summary: 'Get stocktaking session detail' })
  getStocktaking(@Param('id') id: string) {
    return this.service.getStocktaking(id);
  }

  @Post('stocktaking')
  @ApiOperation({ summary: 'Start a new stocktaking session' })
  createStocktaking(
    @Body() dto: CreateStocktakingDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.createStocktaking(dto, user.id);
  }

  @Patch('stocktaking/:id/complete')
  @ApiOperation({ summary: 'Complete stocktaking — compare actual vs system, auto-adjust' })
  completeStocktaking(
    @Param('id') id: string,
    @Body() dto: CompleteStocktakingDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.completeStocktaking(id, dto, user.id);
  }

  // ─── Expiry alerts ────────────────────────────────────────────────────────

  @Get('expiry-alerts')
  @ApiOperation({ summary: 'Get inventory lots expiring within N days' })
  getExpiryAlerts(
    @Query('daysAhead') daysAhead?: number,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.service.getExpiryAlerts(daysAhead ? Number(daysAhead) : 90, warehouseId);
  }

  @Get('lots/:productId')
  @ApiOperation({ summary: 'Get inventory lots for a product' })
  getLotsByProduct(
    @Param('productId') productId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.service.getInventoryLotsByProduct(productId, warehouseId);
  }
}
