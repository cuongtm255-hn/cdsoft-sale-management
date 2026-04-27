import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TenantDataSourceManager } from '../../tenant/tenant-datasource.manager';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { LoyaltyConfig, LoyaltyTier } from './entities/loyalty-config.entity';
import { LoyaltyTransaction, LoyaltyTxType } from './entities/loyalty-transaction.entity';
import { TierChangeLog } from './entities/tier-change-log.entity';
import {
  UpdateLoyaltyConfigDto, RedeemPreviewDto,
  EarnPointsDto, AdjustPointsDto, LoyaltyTxFilterDto,
} from './dto/loyalty.dto';

@Injectable()
export class LoyaltyService {
  constructor(
    private readonly dsManager: TenantDataSourceManager,
    private readonly tenantCtx: TenantContextService,
  ) {}

  private async getDs(): Promise<DataSource> {
    return this.dsManager.getDataSource(this.tenantCtx.getTenantCode()!);
  }

  private async getRepo<T extends object>(entity: new (...args: any[]) => T): Promise<Repository<T>> {
    return (await this.getDs()).getRepository(entity) as Repository<T>;
  }

  // ─── Config ───────────────────────────────────────────────────────────────

  async getConfig(): Promise<LoyaltyConfig> {
    const repo = await this.getRepo(LoyaltyConfig);
    let config = await repo.findOne({ where: {} as any, order: { createdAt: 'ASC' } });
    if (!config) {
      config = await repo.save(repo.create({
        isEnabled: false,
        pointsPerAmount: 1000,
        amountPerPoint: 1000,
        currencyUnit: 'VND',
        tierEvaluationPeriodDays: 365,
        pointExpiryDays: 730,
        allowTierDowngrade: true,
        tiers: [
          { name: 'SILVER', label: 'Bạc', minPoints: 0, discountPercent: 0 },
          { name: 'GOLD', label: 'Vàng', minPoints: 1000, discountPercent: 2 },
          { name: 'DIAMOND', label: 'Kim cương', minPoints: 5000, discountPercent: 5 },
        ],
      }));
    }
    return config;
  }

  async updateConfig(dto: UpdateLoyaltyConfigDto): Promise<LoyaltyConfig> {
    const config = await this.getConfig();
    const repo = await this.getRepo(LoyaltyConfig);

    if (dto.tiers) {
      const sorted = [...dto.tiers].sort((a, b) => a.minPoints - b.minPoints);
      if (sorted[0]?.minPoints !== 0) {
        throw new BadRequestException('Tier đầu tiên phải có minPoints = 0');
      }
      dto.tiers = sorted;
    }

    Object.assign(config, dto);
    return repo.save(config);
  }

  // ─── Earn Points ──────────────────────────────────────────────────────────

  async earnPoints(dto: EarnPointsDto, userId?: string): Promise<LoyaltyTransaction> {
    const config = await this.getConfig();
    if (!config.isEnabled) return null as unknown as LoyaltyTransaction;

    const ds = await this.getDs();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.pointExpiryDays);

    const txRepo = await this.getRepo(LoyaltyTransaction);
    const tx = await txRepo.save(txRepo.create({
      customerId: dto.customerId,
      type: LoyaltyTxType.EARN,
      points: dto.points,
      refId: dto.refId,
      refType: dto.refType ?? 'manual',
      description: dto.description ?? `Tích ${dto.points} điểm`,
      expiresAt,
      createdBy: userId,
    }));

    await ds.query(
      `UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?`,
      [dto.points, dto.customerId],
    );

    await this.evaluateTierForCustomer(dto.customerId, config);
    return tx;
  }

  async earnPointsFromPayment(
    customerId: string,
    paymentAmount: number,
    paymentId: string,
  ): Promise<void> {
    const config = await this.getConfig();
    if (!config.isEnabled) return;

    const pointsEarned = Math.floor(paymentAmount / Number(config.pointsPerAmount));
    if (pointsEarned <= 0) return;

    await this.earnPoints({
      customerId,
      points: pointsEarned,
      refId: paymentId,
      refType: 'payment',
      description: `Tích điểm từ thanh toán`,
    });
  }

  // ─── Redeem Preview ───────────────────────────────────────────────────────

  async redeemPreview(dto: RedeemPreviewDto) {
    const config = await this.getConfig();
    const ds = await this.getDs();

    const customers = await ds.query(
      `SELECT loyalty_points FROM customers WHERE id = ?`,
      [dto.customerId],
    );
    if (!customers.length) throw new NotFoundException('Customer not found');

    const currentPoints = Number(customers[0].loyalty_points ?? 0);
    if (dto.pointsToRedeem > currentPoints) {
      throw new BadRequestException('Số điểm sử dụng vượt quá điểm hiện có');
    }

    const discountAmount = dto.pointsToRedeem * Number(config.amountPerPoint);
    const remainingPoints = currentPoints - dto.pointsToRedeem;

    return { pointsToRedeem: dto.pointsToRedeem, discountAmount, remainingPoints };
  }

  // ─── Redeem (called from order service) ──────────────────────────────────

  async redeemPoints(
    customerId: string,
    pointsToRedeem: number,
    orderId: string,
    userId?: string,
  ): Promise<void> {
    if (pointsToRedeem <= 0) return;
    const config = await this.getConfig();
    if (!config.isEnabled) return;

    const ds = await this.getDs();
    const customers = await ds.query(
      `SELECT loyalty_points FROM customers WHERE id = ?`,
      [customerId],
    );
    if (!customers.length) throw new NotFoundException('Customer not found');

    const currentPoints = Number(customers[0].loyalty_points ?? 0);
    if (pointsToRedeem > currentPoints) {
      throw new BadRequestException('Không đủ điểm để sử dụng');
    }

    const txRepo = await this.getRepo(LoyaltyTransaction);
    await txRepo.save(txRepo.create({
      customerId,
      type: LoyaltyTxType.REDEEM,
      points: -pointsToRedeem,
      refId: orderId,
      refType: 'order',
      description: `Dùng ${pointsToRedeem} điểm cho đơn hàng`,
      createdBy: userId,
    }));

    await ds.query(
      `UPDATE customers SET loyalty_points = GREATEST(0, loyalty_points - ?) WHERE id = ?`,
      [pointsToRedeem, customerId],
    );
  }

  // ─── Adjust Points ────────────────────────────────────────────────────────

  async adjustPoints(dto: AdjustPointsDto, userId: string): Promise<LoyaltyTransaction> {
    const ds = await this.getDs();
    const txRepo = await this.getRepo(LoyaltyTransaction);

    const tx = await txRepo.save(txRepo.create({
      customerId: dto.customerId,
      type: LoyaltyTxType.ADJUST,
      points: dto.points,
      refType: 'manual',
      description: dto.description,
      createdBy: userId,
    }));

    if (dto.points >= 0) {
      await ds.query(
        `UPDATE customers SET loyalty_points = loyalty_points + ? WHERE id = ?`,
        [dto.points, dto.customerId],
      );
    } else {
      await ds.query(
        `UPDATE customers SET loyalty_points = GREATEST(0, loyalty_points + ?) WHERE id = ?`,
        [dto.points, dto.customerId],
      );
    }

    const config = await this.getConfig();
    await this.evaluateTierForCustomer(dto.customerId, config);
    return tx;
  }

  // ─── Customer Loyalty Summary ─────────────────────────────────────────────

  async getCustomerLoyalty(customerId: string) {
    const ds = await this.getDs();
    const config = await this.getConfig();

    const customers = await ds.query(
      `SELECT id, loyalty_points, member_tier FROM customers WHERE id = ? AND deleted_at IS NULL`,
      [customerId],
    );
    if (!customers.length) throw new NotFoundException('Customer not found');
    const customer = customers[0];

    const transactions = await ds.query(
      `SELECT id, type, points, ref_type, ref_id, description, expires_at, created_at
       FROM loyalty_transactions WHERE customer_id = ?
       ORDER BY created_at DESC LIMIT 50`,
      [customerId],
    );

    // Points expiring soonest
    const expiring = await ds.query(
      `SELECT SUM(points) AS amount, MIN(expires_at) AS expires_at
       FROM loyalty_transactions
       WHERE customer_id = ? AND type = 'EARN' AND points > 0
         AND expires_at IS NOT NULL AND expires_at > NOW()
         AND expires_at <= DATE_ADD(NOW(), INTERVAL 30 DAY)`,
      [customerId],
    );

    const tiers = config.tiers ?? [];
    const currentTier = tiers.find((t) => t.name === customer.member_tier);
    const nextTier = [...tiers]
      .sort((a, b) => a.minPoints - b.minPoints)
      .find((t) => t.minPoints > Number(customer.loyalty_points));

    return {
      customerId,
      currentPoints: Number(customer.loyalty_points ?? 0),
      memberTier: customer.member_tier,
      tierLabel: currentTier?.label ?? customer.member_tier,
      tierDiscountPercent: currentTier?.discountPercent ?? 0,
      nextTier: nextTier ?? null,
      transactions,
      pointsExpiringSoon: Number(expiring[0]?.amount) > 0
        ? { amount: Number(expiring[0].amount), expiresAt: expiring[0].expires_at }
        : null,
    };
  }

  // ─── Tier Evaluation ─────────────────────────────────────────────────────

  async evaluateTierForCustomer(customerId: string, config?: LoyaltyConfig): Promise<void> {
    if (!config) config = await this.getConfig();
    if (!config.isEnabled || !config.tiers?.length) return;

    const ds = await this.getDs();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - config.tierEvaluationPeriodDays);

    const result = await ds.query(
      `SELECT COALESCE(SUM(points), 0) AS earned
       FROM loyalty_transactions
       WHERE customer_id = ? AND type = 'EARN' AND created_at >= ?`,
      [customerId, cutoff.toISOString()],
    );
    const earned = Number(result[0]?.earned ?? 0);

    const sorted = [...(config.tiers ?? [])].sort((a, b) => b.minPoints - a.minPoints);
    const newTier = sorted.find((t) => earned >= t.minPoints);
    if (!newTier) return;

    const customers = await ds.query(
      `SELECT member_tier FROM customers WHERE id = ?`,
      [customerId],
    );
    const oldTier = customers[0]?.member_tier;
    if (oldTier === newTier.name) return;

    const isDowngrade = sorted.findIndex((t) => t.name === newTier.name)
      < sorted.findIndex((t) => t.name === oldTier);

    if (isDowngrade && !config.allowTierDowngrade) return;

    await ds.query(
      `UPDATE customers SET member_tier = ? WHERE id = ?`,
      [newTier.name, customerId],
    );

    const logRepo = await this.getRepo(TierChangeLog);
    await logRepo.save(logRepo.create({
      customerId,
      oldTier,
      newTier: newTier.name,
      reason: 'Auto evaluation',
    }));
  }

  // ─── All Transactions ─────────────────────────────────────────────────────

  async listTransactions(filter: LoyaltyTxFilterDto) {
    const repo = await this.getRepo(LoyaltyTransaction);
    const qb = repo.createQueryBuilder('lt').where('1=1');

    if (filter.customerId) qb.andWhere('lt.customer_id = :cid', { cid: filter.customerId });
    if (filter.type) qb.andWhere('lt.type = :type', { type: filter.type });
    if (filter.from) qb.andWhere('lt.created_at >= :from', { from: filter.from });
    if (filter.to) qb.andWhere('lt.created_at <= :to', { to: `${filter.to} 23:59:59` });

    const page = Number(filter.page ?? 1);
    const limit = Number(filter.limit ?? 20);
    qb.orderBy('lt.created_at', 'DESC').skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { data: items, meta: { total, page, limit } };
  }
}
