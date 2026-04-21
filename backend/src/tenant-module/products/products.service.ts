import { Injectable } from '@nestjs/common';
import { TenantDataSourceManager } from '../../tenant/tenant-datasource.manager';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { Product } from './entities/product.entity';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly dsManager: TenantDataSourceManager,
    private readonly tenantCtx: TenantContextService,
  ) {}

  private async getRepo() {
    const code = this.tenantCtx.getTenantCode()!;
    const ds = await this.dsManager.getDataSource(code);
    return ds.getRepository(Product);
  }

  async findAll(pagination: PaginationDto) {
    const repo = await this.getRepo();
    const [data, total] = await repo.findAndCount({
      skip: pagination.skip,
      take: pagination.limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total };
  }

  async findOne(id: string) {
    return (await this.getRepo()).findOneByOrFail({ id });
  }

  async create(dto: CreateProductDto) {
    const repo = await this.getRepo();
    return repo.save(repo.create(dto));
  }

  async update(id: string, dto: UpdateProductDto) {
    const repo = await this.getRepo();
    await repo.update(id, dto as Partial<Product>);
    return repo.findOneByOrFail({ id });
  }

  async remove(id: string) {
    return (await this.getRepo()).softDelete(id);
  }
}
