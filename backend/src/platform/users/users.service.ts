import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { PlatformUser, UserStatus } from './entities/platform-user.entity';
import { CreatePlatformUserDto, UpdatePlatformUserDto } from './dto/user.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(PlatformUser)
    private readonly repo: Repository<PlatformUser>,
  ) {}

  findAll(pagination: PaginationDto) {
    return this.repo.findAndCount({ skip: pagination.skip, take: pagination.limit });
  }

  async findOne(id: string): Promise<PlatformUser> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async create(dto: CreatePlatformUserDto): Promise<PlatformUser> {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.repo.create({ ...dto, passwordHash });
    return this.repo.save(user);
  }

  async update(id: string, dto: UpdatePlatformUserDto): Promise<PlatformUser> {
    const user = await this.findOne(id);
    Object.assign(user, dto);
    return this.repo.save(user);
  }

  async toggleLock(id: string): Promise<PlatformUser> {
    const user = await this.findOne(id);
    user.status = user.status === UserStatus.LOCKED ? UserStatus.ACTIVE : UserStatus.LOCKED;
    return this.repo.save(user);
  }
}
