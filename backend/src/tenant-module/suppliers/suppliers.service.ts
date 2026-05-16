import {
  BadRequestException, Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { ILike, Repository } from 'typeorm';
import { TenantDataSourceManager } from '../../tenant/tenant-datasource.manager';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { Supplier } from './entities/supplier.entity';
import { SupplierAddress } from './entities/supplier-address.entity';
import { SupplierBankAccount } from './entities/supplier-bank-account.entity';
import { CreateSupplierDto, UpdateSupplierDto, SupplierFilterDto } from './dto/supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly dsManager: TenantDataSourceManager,
    private readonly tenantCtx: TenantContextService,
  ) {}

  private async getDs() {
    return this.dsManager.getDataSource(this.tenantCtx.getTenantCode()!);
  }

  private async getRepo(): Promise<Repository<Supplier>> {
    return (await this.getDs()).getRepository(Supplier);
  }

  async findAll(filter: SupplierFilterDto) {
    const repo = await this.getRepo();
    const qb = repo.createQueryBuilder('s');

    if (filter.search) {
      qb.andWhere(
        '(s.code LIKE :q OR s.name LIKE :q OR s.phone LIKE :q OR s.taxCode LIKE :q)',
        { q: `%${filter.search}%` },
      );
    }
    if (filter.isActive !== undefined) {
      qb.andWhere('s.isActive = :active', { active: filter.isActive });
    }

    qb.skip(filter.skip).take(filter.limit).orderBy('s.createdAt', 'DESC');
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page: filter.page, limit: filter.limit };
  }

  async findOne(id: string) {
    const repo = await this.getRepo();
    const supplier = await repo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.addresses', 'addresses')
      .leftJoinAndSelect('s.bankAccounts', 'bankAccounts')
      .where('s.id = :id', { id })
      .getOne();

    if (!supplier) throw new NotFoundException(`Supplier ${id} not found`);
    return supplier;
  }

  async create(dto: CreateSupplierDto) {
    const repo = await this.getRepo();
    const ds = await this.getDs();

    const code = dto.code ?? await this.generateCode(repo);
    const exists = await repo.findOne({ where: { code } });
    if (exists) throw new ConflictException('SUPPLIER_CODE_EXISTS');

    if (dto.isCustomer && dto.customerId) {
      const customerExists = await ds.getRepository('customers').findOne({ where: { id: dto.customerId } });
      if (!customerExists) throw new NotFoundException('CUSTOMER_NOT_FOUND');
    }

    const { address, bankAccounts, ...rest } = dto;
    const supplier = repo.create({ ...rest, code });
    await repo.save(supplier);

    if (address) {
      const addrRepo = ds.getRepository(SupplierAddress);
      await addrRepo.save(addrRepo.create({ ...address, supplierId: supplier.id, isDefault: true }));
    }

    if (bankAccounts?.length) {
      const bankRepo = ds.getRepository(SupplierBankAccount);
      await bankRepo.save(bankAccounts.map((b) => bankRepo.create({ ...b, supplierId: supplier.id })));
    }

    return this.findOne(supplier.id);
  }

  async update(id: string, dto: UpdateSupplierDto) {
    const supplier = await this.findOne(id);
    const ds = await this.getDs();
    const repo = ds.getRepository(Supplier);

    if (dto.isCustomer && dto.customerId) {
      const customerExists = await ds.getRepository('customers').findOne({ where: { id: dto.customerId } });
      if (!customerExists) throw new NotFoundException('CUSTOMER_NOT_FOUND');
    }

    const { address, bankAccounts, ...rest } = dto;
    Object.assign(supplier, rest);
    await repo.save(supplier);

    if (address !== undefined) {
      const addrRepo = ds.getRepository(SupplierAddress);
      await addrRepo.delete({ supplierId: id, isDefault: true });
      if (address) {
        await addrRepo.save(addrRepo.create({ ...address, supplierId: id, isDefault: true }));
      }
    }

    if (bankAccounts !== undefined) {
      const bankRepo = ds.getRepository(SupplierBankAccount);
      await bankRepo.delete({ supplierId: id });
      if (bankAccounts.length) {
        await bankRepo.save(bankAccounts.map((b) => bankRepo.create({ ...b, supplierId: id })));
      }
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const supplier = await this.findOne(id);
    if (Number(supplier.currentDebt) > 0) {
      throw new BadRequestException('SUPPLIER_HAS_DEBT');
    }
    // TODO: check pending stock receipts when Module 6 is implemented
    const repo = await this.getRepo();
    supplier.isActive = false;
    await repo.softDelete(id);
    return { success: true };
  }

  private async generateCode(repo: Repository<Supplier>): Promise<string> {
    const last = await repo.findOne({
      where: { code: ILike('NCC-%') },
      order: { code: 'DESC' },
    });
    let num = 1;
    if (last) {
      const match = last.code.match(/NCC-(\d+)/);
      if (match) num = parseInt(match[1], 10) + 1;
    }
    return `NCC-${String(num).padStart(4, '0')}`;
  }
}
