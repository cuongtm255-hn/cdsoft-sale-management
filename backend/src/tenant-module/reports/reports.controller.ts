import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';
import {
  SalesReportFilterDto, InventoryMovementFilterDto, DeadstockFilterDto,
  FinanceReportFilterDto, CommissionFilterDto, KpiFilterDto, UpdateCommissionConfigDto,
  DebtByCustomerFilterDto, DebtBySupplierFilterDto, PurchaseBySupplierFilterDto,
  SalesByCustomerFilterDto, SalesByProductFilterDto,
} from './dto/reports.dto';

@UseGuards(JwtAuthGuard)
@Controller('tenant/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  getSales(@Query() filter: SalesReportFilterDto) {
    return this.reportsService.getSalesReport(filter);
  }

  @Get('sales/profit-by-product')
  getProfitByProduct(@Query() filter: FinanceReportFilterDto) {
    return this.reportsService.getProfitByProduct(filter);
  }

  @Get('inventory/movement')
  getMovement(@Query() filter: InventoryMovementFilterDto) {
    return this.reportsService.getInventoryMovement(filter);
  }

  @Get('inventory/deadstock')
  getDeadstock(@Query() filter: DeadstockFilterDto) {
    return this.reportsService.getDeadstock(filter);
  }

  @Get('inventory/abc-analysis')
  getAbcAnalysis(@Query() filter: FinanceReportFilterDto) {
    return this.reportsService.getAbcAnalysis(filter);
  }

  @Get('finance/pnl')
  getPnl(@Query() filter: FinanceReportFilterDto) {
    return this.reportsService.getPnl(filter);
  }

  @Get('finance/cashflow')
  getCashflow(@Query() filter: FinanceReportFilterDto) {
    return this.reportsService.getCashflow(filter);
  }

  @Get('commissions')
  getCommissions(@Query() filter: CommissionFilterDto) {
    return this.reportsService.getCommissions(filter);
  }

  @Get('kpi')
  getKpi(@Query() filter: KpiFilterDto) {
    return this.reportsService.getKpiReport(filter);
  }

  @Get('debt-by-customer')
  getDebtByCustomer(@Query() filter: DebtByCustomerFilterDto) {
    return this.reportsService.getDebtByCustomer(filter);
  }

  @Get('debt-by-supplier')
  getDebtBySupplier(@Query() filter: DebtBySupplierFilterDto) {
    return this.reportsService.getDebtBySupplier(filter);
  }

  @Get('purchase-by-supplier')
  getPurchaseBySupplier(@Query() filter: PurchaseBySupplierFilterDto) {
    return this.reportsService.getPurchaseBySupplier(filter);
  }

  @Get('sales-by-customer')
  getSalesByCustomer(@Query() filter: SalesByCustomerFilterDto) {
    return this.reportsService.getSalesByCustomer(filter);
  }

  @Get('sales-by-product')
  getSalesByProduct(@Query() filter: SalesByProductFilterDto) {
    return this.reportsService.getSalesByProduct(filter);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('tenant/commissions')
export class CommissionsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('config')
  getConfig() {
    return this.reportsService.getCommissionConfig();
  }

  @Put('config')
  updateConfig(@Body() dto: UpdateCommissionConfigDto) {
    return this.reportsService.updateCommissionConfig(dto);
  }
}
