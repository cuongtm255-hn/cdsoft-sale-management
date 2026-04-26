import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TenantDataSourceManager } from '../../tenant/tenant-datasource.manager';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { Category } from './entities/category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly dsManager: TenantDataSourceManager,
    private readonly tenantCtx: TenantContextService,
  ) {}

  private async getDs() {
    return this.dsManager.getDataSource(this.tenantCtx.getTenantCode()!);
  }

  private async getRepo(): Promise<Repository<Category>> {
    return (await this.getDs()).getRepository(Category);
  }

  async findTree(): Promise<Category[]> {
    const all = await (await this.getRepo()).find({ order: { sortOrder: 'ASC', name: 'ASC' } });
    return this.buildTree(all, null);
  }

  async findFlat(): Promise<Category[]> {
    return (await this.getRepo()).find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  async findOne(id: string): Promise<Category> {
    const cat = await (await this.getRepo()).findOne({ where: { id } });
    if (!cat) throw new NotFoundException(`Category ${id} not found`);
    return cat;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const repo = await this.getRepo();

    if (dto.parentId) {
      const parent = await repo.findOne({ where: { id: dto.parentId } });
      if (!parent) throw new NotFoundException('Parent category not found');
      if (parent.parentId) {
        const grandparent = await repo.findOne({ where: { id: parent.parentId } });
        if (grandparent?.parentId) throw new BadRequestException('Max category depth (3 levels) exceeded');
      }
    }

    const slug = await this.uniqueSlug(dto.name, repo);
    return repo.save(repo.create({ ...dto, slug }));
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const repo = await this.getRepo();
    const category = await this.findOne(id);
    if (dto.name && dto.name !== category.name) {
      category.slug = await this.uniqueSlug(dto.name, repo, id);
    }
    Object.assign(category, dto);
    return repo.save(category);
  }

  async remove(id: string): Promise<void> {
    const ds = await this.getDs();
    const repo = ds.getRepository(Category);

    const childCount = await repo.count({ where: { parentId: id } });
    if (childCount > 0) throw new BadRequestException(`Cannot delete — ${childCount} subcategories exist`);

    const productCount = await ds.getRepository(Product).count({ where: { categoryId: id } });
    if (productCount > 0) throw new BadRequestException(`Cannot delete — ${productCount} products use this category`);

    await repo.delete(id);
  }

  private buildTree(cats: Category[], parentId: string | null): Category[] {
    return cats
      .filter((c) => (c.parentId ?? null) === parentId)
      .map((c) => ({ ...c, children: this.buildTree(cats, c.id) }));
  }

  private async uniqueSlug(name: string, repo: Repository<Category>, excludeId?: string): Promise<string> {
    const base = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let slug = base;
    let i = 1;
    while (true) {
      const existing = await repo.findOne({ where: { slug } });
      if (!existing || existing.id === excludeId) return slug;
      slug = `${base}-${i++}`;
    }
  }
}
