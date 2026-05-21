import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ILike, Repository } from 'typeorm';
import { Tenant, TenantStatus, ProvisioningStatus } from './entities/tenant.entity';
import { TenantMachine } from './entities/tenant-machine.entity';
import { CreateTenantDto, UpdateTenantDto, UpdateTenantStatusDto, CreateTenantMachineDto } from './dto/create-tenant.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { TenantProvisioningService } from './tenant-provisioning.service';
import * as crypto from 'crypto';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly repo: Repository<Tenant>,
    @InjectRepository(TenantMachine)
    private readonly machineRepo: Repository<TenantMachine>,
    private readonly provisioningService: TenantProvisioningService,
    private readonly config: ConfigService,
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

    const isExternal = dto.isExternalProduct === true;
    const initialStatus = isExternal ? ProvisioningStatus.ACTIVE : ProvisioningStatus.PENDING;

    const tenant = this.repo.create({ ...dto, createdBy, provisioningStatus: initialStatus });
    const savedTenant = await this.repo.save(tenant);

    if (!isExternal) {
      // Bắt đầu provisioning bất đồng bộ
      this.provisioningService.provisionTenant(savedTenant.id).catch((err) => {
        this.logger.error(`Error triggering provisioning for tenant ${savedTenant.id}`, err);
      });
    }

    return savedTenant;
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

  async getMachines(tenantId: string): Promise<TenantMachine[]> {
    await this.findOne(tenantId);
    return this.machineRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async addMachine(tenantId: string, dto: CreateTenantMachineDto): Promise<TenantMachine> {
    const tenant = await this.findOne(tenantId);
    if (!tenant.isExternalProduct) {
      throw new ConflictException('Machines can only be added to external product tenants');
    }

    const machineCode = dto.machineCode.trim();
    if (!machineCode) {
      throw new ConflictException('MachineCode cannot be empty');
    }

    // Generate Active Key
    const normalizedMachineCode = machineCode.replace(/-/g, '').trim().toUpperCase();
    const productCode = "CDSOFT_EZACC"; // Hardcoded for now based on script, could be mapped based on externalProductName
    const licenseType = "PerMachine";
    const issuedAtUtc = new Date().toISOString();

    const payload = `product=${productCode};machine=${normalizedMachineCode};license=${licenseType};issued=${issuedAtUtc}`;

    let activeKey = '';
    try {
      const xmlString = this.config.get<string>('app.ezaccPrivateKey');
      if (!xmlString) {
        throw new Error('EZACC_LICENSE_PRIVATE_KEY is not configured in env variables');
      }

      const extract = (tag: string) => {
        const match = xmlString.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
        return match ? Buffer.from(match[1], 'base64') : null;
      };

      const jwk = {
        kty: 'RSA',
        n: extract('Modulus')?.toString('base64url'),
        e: extract('Exponent')?.toString('base64url'),
        d: extract('D')?.toString('base64url'),
        p: extract('P')?.toString('base64url'),
        q: extract('Q')?.toString('base64url'),
        dp: extract('DP')?.toString('base64url'),
        dq: extract('DQ')?.toString('base64url'),
        qi: extract('InverseQ')?.toString('base64url'),
      };

      const privateKey = crypto.createPrivateKey({ key: jwk, format: 'jwk' });
      const signer = crypto.createSign('SHA256');
      signer.update(payload);
      const signatureBytes = signer.sign(privateKey);
      
      const payloadBytes = Buffer.from(payload);
      
      activeKey = "EZACC1|" + payloadBytes.toString('base64url') + "|" + signatureBytes.toString('base64url');
    } catch (error) {
      this.logger.error('Failed to generate active key', error);
      throw new ConflictException('Could not generate active key. Please verify the secret key is configured properly.');
    }

    const machine = this.machineRepo.create({
      tenantId,
      machineName: dto.machineName,
      machineCode: machineCode,
      activeKey: activeKey,
    });

    return this.machineRepo.save(machine);
  }
}
