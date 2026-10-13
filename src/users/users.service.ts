import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Crop } from '../crops/crop.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { AuthUser } from '../common/auth';
import { apiError } from '../common/errors';

const toUserResponse = (u: User) => ({ id: u.id, full_name: u.full_name, email: u.email, role: u.role, created_at: u.created_at });

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Crop) private readonly crops: Repository<Crop>,
  ) {}

  async findAll() {
    return (await this.users.find({ order: { id: 'ASC' } })).map(toUserResponse);
  }

  async findOne(id: number) {
    return toUserResponse(await this.load(id));
  }

  async create(dto: CreateUserDto) {
    if (await this.users.exist({ where: { email: dto.email } })) {
      throw apiError(HttpStatus.CONFLICT, 'CONFLICT', 'That email is already registered.', { email: 'That email is already registered.' });
    }
    const { password, ...rest } = dto;
    const user = await this.users.save(this.users.create({ ...rest, password_hash: await bcrypt.hash(password, 10) }));
    return toUserResponse(user);
  }

  async update(actor: AuthUser, id: number, dto: UpdateUserDto) {
    const user = await this.load(id);
    if (id === actor.id && dto.role && dto.role !== user.role) {
      throw apiError(HttpStatus.CONFLICT, 'CONFLICT', 'You cannot change your own role.');
    }
    const { password, ...rest } = dto;
    Object.assign(user, rest);
    if (password) user.password_hash = await bcrypt.hash(password, 10);
    return toUserResponse(await this.users.save(user));
  }

  async remove(actor: AuthUser, id: number) {
    const user = await this.load(id);
    if (id === actor.id) throw apiError(HttpStatus.CONFLICT, 'CONFLICT', 'You cannot delete your own account.');
    if (await this.crops.exist({ where: { user_id: id } })) {
      throw apiError(HttpStatus.CONFLICT, 'CONFLICT', 'This user still owns crops and cannot be deleted.');
    }
    await this.users.remove(user);
  }

  private async load(id: number) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }
}
