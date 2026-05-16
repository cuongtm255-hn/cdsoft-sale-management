import {
  Injectable, NotFoundException, ConflictException, ForbiddenException,
} from '@nestjs/common';
import { ILike, Repository } from 'typeorm';
import { TenantDataSourceManager } from '../../tenant/tenant-datasource.manager';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { Customer, CustomerGroup } from './entities/customer.entity';
import { CustomerAddress } from './entities/customer-address.entity';
import {
  CreateCustomerDto, UpdateCustomerDto, CustomerFilterDto, TransactionFilterDto,
} from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly dsManager: TenantDataSourceManager,
    private readonly tenantCtx: TenantContextService,
  ) {}

  private async getDs() {
    return this.dsManager.getDataSource(this.tenantCtx.getTenantCode()!);
  }

  private async getRepo(): Promise<Repository<Customer>> {
    return (await this.getDs()).getRepository(Customer);
  }

  async findAll(filter: CustomerFilterDto) {
    const repo = await this.getRepo();
    const qb = repo.createQueryBuilder('c');

    if (filter.search) {
      qb.andWhere(
        '(c.code LIKE :s OR c.name LIKE :s OR c.phone LIKE :s OR c.email LIKE :s)',
        { s: `%${filter.search}%` },
      );
    }
    if (filter.group) {
      qb.andWhere('c.customerGroup = :group', { group: filter.group });
    }
    if (filter.isActive !== undefined) {
      qb.andWhere('c.isActive = :active', { active: filter.isActive });
    }
    if (filter.salesRepId) {
      qb.andWhere('c.salesRepId = :rep', { rep: filter.salesRepId });
    }

    qb.skip(filter.skip).take(filter.limit).orderBy('c.createdAt', 'DESC');
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page: filter.page, limit: filter.limit };
  }

  async findOne(id: string): Promise<Customer & { availableCredit: number }> {
    const repo = await this.getRepo();
    const customer = await repo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.addresses', 'addresses')
      .where('c.id = :id', { id })
      .getOne();

    if (!customer) throw new NotFoundException(`Customer ${id} not found`);

    const availableCredit = Math.max(0, Number(customer.creditLimit) - Number(customer.currentDebt));
    return { ...customer, availableCredit };
  }

  async create(dto: CreateCustomerDto, currentUserRole: string): Promise<Customer & { availableCredit: number }> {
    const repo = await this.getRepo();
    const ds = await this.getDs();

    if (currentUserRole === 'STAFF' && Number(dto.creditLimit ?? 0) > 0) {
      throw new ForbiddenException('PERMISSION_DENIED');
    }

    const code = dto.code ?? await this.generateCode(repo);
    const codeExists = await repo.findOne({ where: { code } });
    if (codeExists) throw new ConflictException('CUSTOMER_CODE_EXISTS');

    const { address, group, ...rest } = dto;
    const customer = repo.create({
      ...rest,
      code,
      customerGroup: group ?? CustomerGroup.RETAIL,
    });
    await repo.save(customer);

    if (address) {
      const addrRepo = ds.getRepository(CustomerAddress);
      await addrRepo.save(addrRepo.create({ ...address, customerId: customer.id, isDefault: true }));
    }

    return this.findOne(customer.id);
  }

  async update(
    id: string,
    dto: UpdateCustomerDto,
    currentUserRole: string,
  ): Promise<Customer & { availableCredit: number }> {
    const customer = await this.findOne(id);
    const ds = await this.getDs();
    const repo = ds.getRepository(Customer);

    if (currentUserRole === 'STAFF') {
      if (dto.creditLimit !== undefined || dto.paymentTermDays !== undefined || dto.group !== undefined) {
        throw new ForbiddenException('STAFF cannot modify credit limit, payment terms, or customer group');
      }
    }

    const { address, group, ...rest } = dto;
    Object.assign(customer, rest);
    if (group) customer.customerGroup = group as CustomerGroup;
    await repo.save(customer);

    if (address !== undefined) {
      const addrRepo = ds.getRepository(CustomerAddress);
      await addrRepo.delete({ customerId: id, isDefault: true });
      if (address) {
        await addrRepo.save(addrRepo.create({ ...address, customerId: id, isDefault: true }));
      }
    }

    return this.findOne(id);
  }

  async getTransactions(id: string, filter: TransactionFilterDto) {
    await this.findOne(id);
    // TODO: Query orders + payments + return_orders tables when Module 7/8 implemented
    return {
      data: [],
      summary: {
        totalOrders: 0,
        totalPurchased: 0,
        currentDebt: 0,
        loyaltyPoints: 0,
        memberTier: 'NONE',
      },
      meta: { total: 0, page: filter.page, limit: filter.limit },
    };
  }

  private async generateCode(repo: Repository<Customer>): Promise<string> {
    const last = await repo.findOne({
      where: { code: ILike('KH-%') },
      order: { code: 'DESC' },
    });
    let num = 1;
    if (last) {
      const match = last.code.match(/KH-(\d+)/);
      if (match) num = parseInt(match[1], 10) + 1;
    }
    return `KH-${String(num).padStart(4, '0')}`;
  }
}
