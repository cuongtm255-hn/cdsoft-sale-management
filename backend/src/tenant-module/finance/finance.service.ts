import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantDataSourceManager } from '../../tenant/tenant-datasource.manager';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { CashFund } from '../invoices/entities/cash-fund.entity';
import { BankAccount } from '../invoices/entities/bank-account.entity';
import { Disbursement } from './entities/disbursement.entity';
import { CreateDisbursementDto, RejectDisbursementDto, UpdateDisbursementDto } from './dto/finance.dto';

@Injectable()
export class FinanceService {
  constructor(
    private readonly dsManager: TenantDataSourceManager,
    private readonly tenantCtx: TenantContextService,
  ) {}

  private async getDs() {
    return this.dsManager.getDataSource(this.tenantCtx.getTenantCode()!);
  }

  private validateDisbursementTarget(target: { cashFundId?: string; bankAccountId?: string }) {
    if (target.cashFundId && target.bankAccountId) {
      throw new BadRequestException('LEDGER_TARGET_AMBIGUOUS');
    }
    if (!target.cashFundId && !target.bankAccountId) {
      throw new BadRequestException('LEDGER_TARGET_REQUIRED');
    }
  }

  private async applyDisbursementBalance(ds: DataSource, target: { cashFundId?: string; bankAccountId?: string }, amount: number) {
    if (target.cashFundId) {
      const repo = ds.getRepository(CashFund);
      const fund = await repo.findOne({ where: { id: target.cashFundId } });
      if (!fund) throw new BadRequestException('CASH_FUND_NOT_FOUND');
      await repo.update(target.cashFundId, { balance: Number(fund.balance ?? 0) - amount });
      return;
    }

    if (target.bankAccountId) {
      const repo = ds.getRepository(BankAccount);
      const account = await repo.findOne({ where: { id: target.bankAccountId } });
      if (!account) throw new BadRequestException('BANK_ACCOUNT_NOT_FOUND');
      await repo.update(target.bankAccountId, { balance: Number(account.balance ?? 0) - amount });
    }
  }

  async listCashFunds() {
    const ds = await this.getDs();
    return ds.getRepository(CashFund).find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  async listBankAccounts() {
    const ds = await this.getDs();
    return ds.getRepository(BankAccount).find({ where: { isActive: true }, order: { bankName: 'ASC' } });
  }

  async createDisbursement(dto: CreateDisbursementDto, userId: string) {
    const ds   = await this.getDs();
    const repo = ds.getRepository(Disbursement);
    this.validateDisbursementTarget(dto);
    const status = dto.requiresApproval ? 'PENDING_APPROVAL' : 'APPROVED';
    const entity = repo.create({ ...dto, createdBy: userId, status });

    if (status === 'APPROVED') {
      await this.applyDisbursementBalance(ds, dto, dto.amount);
    }

    return repo.save(entity);
  }

  async listDisbursements(status?: string) {
    const ds   = await this.getDs();
    const repo = ds.getRepository(Disbursement);
    const qb   = repo.createQueryBuilder('d').orderBy('d.createdAt', 'DESC');
    if (status) qb.where('d.status = :status', { status });
    return qb.getMany();
  }

  async approveDisbursement(id: string, userId: string) {
    const ds     = await this.getDs();
    const repo   = ds.getRepository(Disbursement);
    const entity = await repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Disbursement not found');

    entity.status     = 'APPROVED';
    entity.approvedBy = userId;
    await repo.save(entity);

    this.validateDisbursementTarget(entity);
    await this.applyDisbursementBalance(ds, entity, Number(entity.amount));
    return entity;
  }

  async updateDisbursement(id: string, dto: UpdateDisbursementDto) {
    const ds   = await this.getDs();
    const repo = ds.getRepository(Disbursement);
    const entity = await repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Disbursement not found');
    if (entity.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('CANNOT_EDIT_NON_PENDING');
    }
    const targetType = dto.targetType ?? (entity.cashFundId ? 'CASH_FUND' : 'BANK_ACCOUNT');
    const cashFundId   = targetType === 'CASH_FUND'    ? (dto.cashFundId   ?? entity.cashFundId)   : undefined;
    const bankAccountId = targetType === 'BANK_ACCOUNT' ? (dto.bankAccountId ?? entity.bankAccountId) : undefined;
    this.validateDisbursementTarget({ cashFundId, bankAccountId });
    await repo.update(id, {
      ...(dto.disbursementType !== undefined && { disbursementType: dto.disbursementType }),
      ...(dto.amount !== undefined && { amount: dto.amount }),
      ...(dto.description !== undefined && { description: dto.description }),
      cashFundId,
      bankAccountId,
    });
    return repo.findOne({ where: { id } });
  }

  async rejectDisbursement(id: string, dto: RejectDisbursementDto) {
    const ds     = await this.getDs();
    const repo   = ds.getRepository(Disbursement);
    const entity = await repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Disbursement not found');
    entity.status       = 'REJECTED';
    entity.rejectReason = dto.reason;
    return repo.save(entity);
  }
}
