import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TenantDataSourceManager } from '../../tenant/tenant-datasource.manager';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { Product } from './entities/product.entity';
import { ProductUnit } from './entities/product-unit.entity';
import { ProductPrice } from './entities/product-price.entity';
import { CreateProductDto, UpdateProductDto, ProductFilterDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly dsManager: TenantDataSourceManager,
    private readonly tenantCtx: TenantContextService,
  ) {}

  private async getDs() {
    return this.dsManager.getDataSource(this.tenantCtx.getTenantCode()!);
  }

  private async getRepo(): Promise<Repository<Product>> {
    return (await this.getDs()).getRepository(Product);
  }

  async findAll(filter: ProductFilterDto) {
    const repo = await this.getRepo();
    const qb = repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.prices', 'prices')
      .where('p.deletedAt IS NULL');

    if (filter.search) {
      qb.andWhere('(p.sku LIKE :s OR p.name LIKE :s OR p.barcode LIKE :s)', {
        s: `%${filter.search}%`,
      });
    }
    if (filter.categoryId) {
      qb.andWhere('p.categoryId = :cid', { cid: filter.categoryId });
    }
    if (filter.isActive !== undefined) {
      qb.andWhere('p.isActive = :active', { active: filter.isActive });
    }
    if (filter.hasLowStock) {
      qb.andWhere('p.minStockLevel > 0 AND p.stockQuantity <= p.minStockLevel');
    }

    qb.skip(filter.skip).take(filter.limit).orderBy('p.createdAt', 'DESC');

    const [data, total] = await qb.getManyAndCount();

    const enriched = data.map((p) => ({
      ...p,
      isLowStock: p.minStockLevel > 0 && p.stockQuantity <= p.minStockLevel,
      retailPrice: p.prices?.find((pr) => pr.priceType === 'RETAIL')?.amount,
    }));

    return { data: enriched, total, page: filter.page, limit: filter.limit };
  }

  async findOne(id: string): Promise<Product> {
    const repo = await this.getRepo();
    const product = await repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.units', 'units')
      .leftJoinAndSelect('p.prices', 'prices')
      .where('p.id = :id', { id })
      .andWhere('p.deletedAt IS NULL')
      .getOne();

    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const repo = await this.getRepo();
    const ds = await this.getDs();

    const skuExists = await repo.findOne({ where: { sku: dto.sku } });
    if (skuExists) throw new ConflictException('SKU_EXISTS');

    if (dto.barcode) {
      const barcodeExists = await repo.findOne({ where: { barcode: dto.barcode } });
      if (barcodeExists) throw new ConflictException('BARCODE_EXISTS');
    }

    const { units, prices, ...productData } = dto;
    const product = repo.create({ ...productData, baseUnit: productData.baseUnit || 'Cái' });
    await repo.save(product);

    if (units?.length) {
      const unitRepo = ds.getRepository(ProductUnit);
      await unitRepo.save(units.map((u) => unitRepo.create({ ...u, productId: product.id })));
    }

    if (prices?.length) {
      const priceRepo = ds.getRepository(ProductPrice);
      await priceRepo.save(prices.map((p) => priceRepo.create({ ...p, productId: product.id })));
    }

    return this.findOne(product.id);
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const repo = await this.getRepo();
    const ds = await this.getDs();
    const product = await this.findOne(id);

    const { units, prices, ...fields } = dto;
    Object.assign(product, fields);
    await repo.save(product);

    if (units !== undefined) {
      const unitRepo = ds.getRepository(ProductUnit);
      await unitRepo.delete({ productId: id });
      if (units.length) {
        await unitRepo.save(units.map((u) => unitRepo.create({ ...u, productId: id })));
      }
    }

    if (prices !== undefined) {
      const priceRepo = ds.getRepository(ProductPrice);
      await priceRepo.delete({ productId: id });
      if (prices.length) {
        await priceRepo.save(prices.map((p) => priceRepo.create({ ...p, productId: id })));
      }
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<{ message: string }> {
    const product = await this.findOne(id);

    if (Number(product.stockQuantity) > 0) {
      throw new BadRequestException('PRODUCT_HAS_STOCK');
    }

    const repo = await this.getRepo();
    product.isActive = false;
    await repo.save(product);
    await repo.softDelete(id);

    return { message: 'Product deactivated successfully' };
  }

  async toggleActive(id: string): Promise<Product> {
    const product = await this.findOne(id);
    product.isActive = !product.isActive;
    return (await this.getRepo()).save(product);
  }
}
