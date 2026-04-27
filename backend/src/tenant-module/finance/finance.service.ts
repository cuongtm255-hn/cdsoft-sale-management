import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantDataSourceManager } from '@tenant/tenant-datasource.manager';
import { TenantContextService } from '@tenant/tenant-context.service';
import { CashFund } from '../invoices/entities/cash-fund.entity';
import { BankAccount } from '../invoices/entities/bank-account.entity';
import { Disbursement } from './entities/disbursement.entity';
import { CreateDisbursementDto, RejectDisbursementDto } from './dto/finance.dto';

@Injectable()
export class FinanceService {
  constructor(
    private readonly dsManager: TenantDataSourceManager,
    private readonly tenantCtx: TenantContextService,
  ) {}

  private async getDs() {
    return this.dsManager.getDataSource(this.tenantCtx.getTenantCode()!);
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
    const status = dto.requiresApproval ? 'PENDING_APPROVAL' : 'APPROVED';
    const entity = repo.create({ ...dto, createdBy: userId, status });

    if (status === 'APPROVED' && dto.cashFundId) {
      await ds.query(
        `UPDATE cash_funds SET balance = balance - ? WHERE id = ?`,
        [dto.amount, dto.cashFundId],
      );
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

    if (entity.cashFundId) {
      await ds.query(
        `UPDATE cash_funds SET balance = balance - ? WHERE id = ?`,
        [entity.amount, entity.cashFundId],
      );
    }
    return entity;
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
