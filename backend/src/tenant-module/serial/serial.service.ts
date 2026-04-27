import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantDataSourceManager } from '@tenant/tenant-datasource.manager';
import { TenantContextService } from '@tenant/tenant-context.service';
import { SerialNumber } from './entities/serial-number.entity';
import { SerialQueryDto } from './dto/serial.dto';
import { PaginationDto } from '@common/dto/pagination.dto';

@Injectable()
export class SerialService {
  constructor(
    private readonly dsManager: TenantDataSourceManager,
    private readonly tenantCtx: TenantContextService,
  ) {}

  private async getDs() {
    return this.dsManager.getDataSource(this.tenantCtx.getTenantCode()!);
  }

  async warrantyLookup(serial: string) {
    const ds = await this.getDs();

    const rows = await ds.query(`
      SELECT
        sn.*,
        p.name AS productName, p.sku AS productSku,
        c.name AS customerName
      FROM serial_numbers sn
      JOIN products p ON sn.product_id = p.id
      LEFT JOIN customers c ON sn.customer_id = c.id
      WHERE (sn.serial_number = ? OR sn.imei = ?)
        AND sn.deleted_at IS NULL
      LIMIT 1
    `, [serial, serial]);

    if (!rows.length) throw new NotFoundException('Serial number not found');
    const row = rows[0];

    const warrantyExpiry  = row.warranty_expiry;
    const warrantyDaysRemaining = warrantyExpiry
      ? Math.max(0, Math.ceil((new Date(warrantyExpiry).getTime() - Date.now()) / 86400000))
      : null;

    return {
      serialNumber:           row.serial_number,
      imei:                   row.imei,
      product:                { id: row.product_id, name: row.productName, sku: row.productSku },
      status:                 row.status,
      customer:               row.customer_id ? { id: row.customer_id, name: row.customerName } : null,
      purchasedAt:            row.purchased_at,
      warrantyExpiry,
      warrantyDaysRemaining,
      repairHistory:          [],
    };
  }

  async listByProduct(productId: string, dto: PaginationDto) {
    const ds   = await this.getDs();
    const repo = ds.getRepository(SerialNumber);
    const [data, total] = await repo.createQueryBuilder('sn')
      .where('sn.productId = :productId', { productId })
      .orderBy('sn.createdAt', 'DESC')
      .skip(dto.skip)
      .take(dto.limit)
      .getManyAndCount();
    return { data, meta: { total, page: dto.page, limit: dto.limit } };
  }

  async listByStatus(status: string, dto: SerialQueryDto) {
    const ds   = await this.getDs();
    const repo = ds.getRepository(SerialNumber);
    const qb   = repo.createQueryBuilder('sn')
      .where('sn.status = :status', { status })
      .orderBy('sn.createdAt', 'DESC')
      .skip(dto.skip)
      .take(dto.limit);
    if (dto.productId) qb.andWhere('sn.productId = :pid', { pid: dto.productId });
    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page: dto.page, limit: dto.limit } };
  }
}
