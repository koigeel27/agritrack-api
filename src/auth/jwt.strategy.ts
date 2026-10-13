import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { AuthUser } from '../common/auth';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, @InjectRepository(User) private readonly users: Repository<User>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Runs on every request: a deleted user's old token stops working immediately,
  // and the role always comes from the database, not from the token.
  async validate(payload: { sub: number }): Promise<AuthUser> {
    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('Please sign in to continue.');
    return { id: user.id, full_name: user.full_name, email: user.email, role: user.role };
  }
}
