import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { FinanceService } from './finance.service';
import { CreateDisbursementDto, RejectDisbursementDto } from './dto/finance.dto';

@UseGuards(JwtAuthGuard)
@Controller('tenant/finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('cash-funds')
  listCashFunds() {
    return this.financeService.listCashFunds();
  }

  @Get('bank-accounts')
  listBankAccounts() {
    return this.financeService.listBankAccounts();
  }

  @Post('disbursements')
  createDisbursement(
    @Body() dto: CreateDisbursementDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.financeService.createDisbursement(dto, user.id);
  }

  @Get('disbursements')
  listDisbursements(@Query('status') status?: string) {
    return this.financeService.listDisbursements(status);
  }

  @Patch('disbursements/:id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.financeService.approveDisbursement(id, user.id);
  }

  @Patch('disbursements/:id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectDisbursementDto) {
    return this.financeService.rejectDisbursement(id, dto);
  }
}
