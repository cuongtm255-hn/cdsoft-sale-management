import {
  Body, Controller, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InvoicesService } from './invoices.service';
import {
  InvoiceFilterDto, PurchaseInvoiceFilterDto, RecordPaymentDto, RecordPayablePaymentDto, ArMatchDto,
  ApFilterDto, ArAgingFilterDto,
  CreateCashFundDto, UpdateCashFundDto,
  CreateBankAccountDto, UpdateBankAccountDto,
  CreateManualReceiptDto, UpdateManualReceiptDto,
} from './dto/invoice.dto';

@ApiTags('Tenant / Invoices & Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  // ─── Invoices ─────────────────────────────────────────────────────────────

  @Get('tenant/invoices')
  @ApiOperation({ summary: 'List invoices' })
  listInvoices(@Query() filter: InvoiceFilterDto) {
    return this.service.listInvoices(filter);
  }

  @Get('tenant/invoices/:id')
  @ApiOperation({ summary: 'Get invoice detail' })
  getInvoice(@Param('id') id: string) {
    return this.service.getInvoice(id);
  }

  @Get('tenant/purchase-invoices')
  @ApiOperation({ summary: 'List purchase invoices' })
  listPurchaseInvoices(@Query() filter: PurchaseInvoiceFilterDto) {
    return this.service.listPurchaseInvoices(filter);
  }

  // ─── Payments ─────────────────────────────────────────────────────────────

  @Post('tenant/payments')
  @ApiOperation({ summary: 'Record a payment for an invoice' })
  recordPayment(
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.service.recordPayment(dto, user.id ?? user.sub);
  }

  @Post('tenant/ap/payments')
  @ApiOperation({ summary: 'Record a supplier payment for a purchase invoice' })
  recordPayablePayment(
    @Body() dto: RecordPayablePaymentDto,
    @CurrentUser() user: any,
  ) {
    return this.service.recordPayablePayment(dto, user.id ?? user.sub);
  }

  // ─── AR ──────────────────────────────────────────────────────────────────

  @Get('tenant/ar/aging')
  @ApiOperation({ summary: 'Accounts receivable aging report' })
  getArAging(@Query() filter: ArAgingFilterDto) {
    return this.service.getArAging(filter);
  }

  @Post('tenant/ar/match')
  @ApiOperation({ summary: 'Match payment to invoices' })
  matchPayment(@Body() dto: ArMatchDto) {
    return this.service.matchPaymentToInvoices(dto);
  }

  @Get('tenant/customers/:id/payments')
  @ApiOperation({ summary: 'Customer payment history' })
  customerPayments(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.getCustomerPaymentHistory(id, { from, to, page, limit });
  }

  // ─── AP ──────────────────────────────────────────────────────────────────

  @Get('tenant/ap/schedule')
  @ApiOperation({ summary: 'Accounts payable schedule' })
  getApSchedule(@Query() filter: ApFilterDto) {
    return this.service.getApSchedule(filter);
  }

  // ─── Cash Funds ───────────────────────────────────────────────────────────

  @Get('tenant/cash-funds')
  @ApiOperation({ summary: 'List cash funds' })
  listCashFunds(@Query('includeInactive') includeInactive?: string) {
    return this.service.listCashFunds(includeInactive === 'true');
  }

  @Post('tenant/cash-funds')
  @ApiOperation({ summary: 'Create cash fund' })
  createCashFund(@Body() dto: CreateCashFundDto) {
    return this.service.createCashFund(dto);
  }

  @Patch('tenant/cash-funds/:id')
  @ApiOperation({ summary: 'Update cash fund' })
  updateCashFund(@Param('id') id: string, @Body() dto: UpdateCashFundDto) {
    return this.service.updateCashFund(id, dto);
  }

  // ─── Bank Accounts ────────────────────────────────────────────────────────

  @Get('tenant/bank-accounts')
  @ApiOperation({ summary: 'List bank accounts' })
  listBankAccounts(@Query('includeInactive') includeInactive?: string) {
    return this.service.listBankAccounts(includeInactive === 'true');
  }

  @Post('tenant/bank-accounts')
  @ApiOperation({ summary: 'Create bank account' })
  createBankAccount(@Body() dto: CreateBankAccountDto) {
    return this.service.createBankAccount(dto);
  }

  @Patch('tenant/bank-accounts/:id')
  @ApiOperation({ summary: 'Update bank account' })
  updateBankAccount(@Param('id') id: string, @Body() dto: UpdateBankAccountDto) {
    return this.service.updateBankAccount(id, dto);
  }

  // ─── Cash Receipts ────────────────────────────────────────────────────────

  @Get('tenant/cash-receipts')
  @ApiOperation({ summary: 'List cash receipts and disbursements' })
  listCashReceipts(
    @Query('kind') kind?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listCashReceipts({ kind, from, to, page, limit });
  }

  @Post('tenant/cash-receipts')
  @ApiOperation({ summary: 'Create manual receipt or disbursement' })
  createReceipt(
    @Body() dto: CreateManualReceiptDto,
    @CurrentUser() user: any,
  ) {
    return this.service.createManualReceipt(dto, user.id ?? user.sub);
  }

  @Patch('tenant/cash-receipts/:id')
  @ApiOperation({ summary: 'Update a PENDING cash receipt' })
  updateReceipt(
    @Param('id') id: string,
    @Body() dto: UpdateManualReceiptDto,
  ) {
    return this.service.updateCashReceipt(id, dto);
  }

  @Patch('tenant/cash-receipts/:id/approve')
  @ApiOperation({ summary: 'Approve a PENDING cash receipt' })
  approveReceipt(@Param('id') id: string) {
    return this.service.approveCashReceipt(id);
  }
}
