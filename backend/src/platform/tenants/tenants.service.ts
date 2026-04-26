import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Tenant, TenantStatus } from './entities/tenant.entity';
import { CreateTenantDto, UpdateTenantDto, UpdateTenantStatusDto } from './dto/create-tenant.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly repo: Repository<Tenant>,
  ) {}

  async findAll(pagination: PaginationDto) {
    const where = pagination.search
      ? [
          { tenantCode: ILike(`%${pagination.search}%`) },
          { tenantName: ILike(`%${pagination.search}%`) },
          { companyName: ILike(`%${pagination.search}%`) },
        ]
      : undefined;

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total, page: pagination.page, limit: pagination.limit };
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.repo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException(`Tenant ${id} not found`);
    return tenant;
  }

  async create(dto: CreateTenantDto, createdBy: string): Promise<Tenant> {
    const codeExists = await this.repo.findOne({ where: { tenantCode: dto.tenantCode } });
    if (codeExists) throw new ConflictException(`Tenant code '${dto.tenantCode}' already exists`);

    const emailExists = await this.repo.findOne({ where: { contactEmail: dto.contactEmail } });
    if (emailExists) throw new ConflictException(`Contact email '${dto.contactEmail}' already exists`);

    const tenant = this.repo.create({ ...dto, createdBy });
    return this.repo.save(tenant);
  }

  async update(id: string, dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);
    if (dto.contactEmail && dto.contactEmail !== tenant.contactEmail) {
      const emailExists = await this.repo.findOne({ where: { contactEmail: dto.contactEmail } });
      if (emailExists) throw new ConflictException(`Contact email '${dto.contactEmail}' already exists`);
    }
    Object.assign(tenant, dto);
    return this.repo.save(tenant);
  }

  async updateStatus(id: string, dto: UpdateTenantStatusDto): Promise<Tenant> {
    const tenant = await this.findOne(id);
    tenant.status = dto.status as TenantStatus;
    return this.repo.save(tenant);
  }
}
