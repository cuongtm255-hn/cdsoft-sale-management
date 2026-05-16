import { Injectable } from '@nestjs/common';
import { ChatbotQueryContextService } from './chatbot-query-context.service';
import type { ChatbotAccessContext } from './chatbot-access.service';

@Injectable()
export class ChatbotLoyaltyReadService {
  constructor(private readonly queryCtx: ChatbotQueryContextService) {}

  async getCustomerLoyalty({ customerQuery }: { customerQuery: string }, access?: ChatbotAccessContext) {
    const ds = await this.queryCtx.getDs();
    const customerRows = await ds.query(
      `SELECT id, code, name, loyalty_points, member_tier
         FROM customers
        WHERE deleted_at IS NULL
          ${access?.role === 'STAFF' ? 'AND sales_rep_id = ?' : ''}
          AND (code LIKE ? OR name LIKE ?)
        ORDER BY created_at DESC
        LIMIT 1`,
      [
        ...(access?.role === 'STAFF' ? [access.userId] : []),
        this.queryCtx.like(customerQuery),
        this.queryCtx.like(customerQuery),
      ],
    );

    if (!customerRows.length) return { error: `Không tìm thấy khách hàng "${customerQuery}"` };

    const customer = customerRows[0];
    const txSummary = await ds.query(
      `SELECT
          COALESCE(SUM(CASE WHEN type = 'EARN' THEN points ELSE 0 END), 0) AS earned_points,
          COALESCE(SUM(CASE WHEN type = 'REDEEM' THEN points ELSE 0 END), 0) AS redeemed_points,
          COALESCE(SUM(CASE WHEN type = 'ADJUST' THEN points ELSE 0 END), 0) AS adjusted_points
         FROM loyalty_transactions
        WHERE customer_id = ?`,
      [customer.id],
    );

    return {
      customer_code: customer.code,
      customer_name: customer.name,
      loyalty_points: Number(customer.loyalty_points ?? 0),
      member_tier: customer.member_tier,
      summary: {
        earned_points: Number(txSummary[0]?.earned_points ?? 0),
        redeemed_points: Number(txSummary[0]?.redeemed_points ?? 0),
        adjusted_points: Number(txSummary[0]?.adjusted_points ?? 0),
      },
    };
  }

  async getLoyaltyTransactions({
    customerQuery,
    type,
    fromDate,
    toDate,
    limit = 20,
  }: {
    customerQuery?: string;
    type?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }, access?: ChatbotAccessContext) {
    const ds = await this.queryCtx.getDs();
    const lim = this.queryCtx.clampLimit(limit, 20);
    const where: string[] = ['1=1'];
    const params: any[] = [];

    if (customerQuery) {
      where.push('(c.code LIKE ? OR c.name LIKE ?)');
      params.push(this.queryCtx.like(customerQuery), this.queryCtx.like(customerQuery));
    }
    if (access?.role === 'STAFF') {
      where.push('c.sales_rep_id = ?');
      params.push(access.userId);
    }
    if (type) {
      where.push('lt.type = ?');
      params.push(type);
    }
    if (fromDate) {
      where.push('DATE(lt.created_at) >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      where.push('DATE(lt.created_at) <= ?');
      params.push(toDate);
    }
    params.push(lim);

    const rows = await ds.query(
      `SELECT lt.type, lt.points, lt.ref_type, lt.ref_id, lt.description, lt.expires_at, lt.created_at,
              c.code AS customer_code, c.name AS customer_name
         FROM loyalty_transactions lt
         JOIN customers c ON c.id = lt.customer_id
        WHERE ${where.join(' AND ')}
        ORDER BY lt.created_at DESC
        LIMIT ?`,
      params,
    );

    return { count: rows.length, items: rows };
  }

  async getLoyaltyConfig() {
    const ds = await this.queryCtx.getDs();
    const rows = await ds.query(
      `SELECT is_enabled, points_per_amount, amount_per_point, currency_unit,
              tier_evaluation_period_days, point_expiry_days, allow_tier_downgrade, tiers, updated_at
         FROM loyalty_configs
        ORDER BY updated_at DESC
        LIMIT 1`,
    );

    if (!rows.length) {
      return { error: 'Chưa có cấu hình loyalty trong hệ thống.' };
    }

    return { config: rows[0] };
  }
}
