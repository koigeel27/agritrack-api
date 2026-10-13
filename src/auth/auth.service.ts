import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { LoginDto } from './dto/login.dto';
import { apiError } from '../common/errors';

// Compared against when the email does not exist, so response time does not reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async login({ email, password }: LoginDto) {
    const user = await this.users.findOne({ where: { email }, select: { id: true, full_name: true, email: true, role: true, password_hash: true } });
    const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !ok) throw apiError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
    const token = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { token, user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role } };
  }
}
