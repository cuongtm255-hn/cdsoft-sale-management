import { Injectable, ConflictException, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ILike } from 'typeorm';
import { TenantDataSourceManager } from '../../tenant/tenant-datasource.manager';
import { TenantContextService } from '../../tenant/tenant-context.service';
import { User, UserStatus } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto, UpdateUserStatusDto, ChangePasswordDto } from './dto/user.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly dsManager: TenantDataSourceManager,
    private readonly tenantCtx: TenantContextService,
  ) {}

  private async getRepo() {
    const code = this.tenantCtx.getTenantCode()!;
    const ds = await this.dsManager.getDataSource(code);
    return ds.getRepository(User);
  }

  async findAll(pagination: PaginationDto) {
    const repo = await this.getRepo();
    const where = pagination.search
      ? [
          { fullName: ILike(`%${pagination.search}%`) },
          { email: ILike(`%${pagination.search}%`) },
        ]
      : undefined;

    const [data, total] = await repo.findAndCount({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total, page: pagination.page, limit: pagination.limit };
  }

  async findOne(id: string): Promise<User> {
    const repo = await this.getRepo();
    const user = await repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const repo = await this.getRepo();
    const exists = await repo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already exists');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = repo.create({ ...dto, passwordHash });
    return repo.save(user);
  }

  async update(id: string, dto: UpdateUserDto, currentUserId: string): Promise<User> {
    const user = await this.findOne(id);
    if (dto.role && id === currentUserId) {
      throw new ForbiddenException('Cannot change your own role');
    }
    Object.assign(user, dto);
    const repo = await this.getRepo();
    return repo.save(user);
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto, currentUserId: string): Promise<User> {
    if (id === currentUserId) throw new ForbiddenException('Cannot deactivate your own account');
    const user = await this.findOne(id);
    user.status = dto.status as UserStatus;
    const repo = await this.getRepo();
    return repo.save(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const repo = await this.getRepo();
    const user = await repo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id: userId })
      .getOne();

    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await repo.save(user);
  }
}
