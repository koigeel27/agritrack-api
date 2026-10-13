import { CanActivate, createParamDecorator, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

export type Role = 'farmer' | 'admin';
export interface AuthUser { id: number; full_name: string; email: string; role: Role }

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';

/** Route needs no sign-in. Everything else requires a valid JWT (global guard). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
/** Only these roles may call the route. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);
/** The signed-in user, as loaded by JwtStrategy. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user);

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }
  canActivate(ctx: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    return isPublic ? true : super.canActivate(ctx);
  }
  handleRequest<T = AuthUser>(err: unknown, user: T): T {
    if (err || !user) throw new UnauthorizedException('Please sign in to continue.');
    return user;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(ctx: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES, [ctx.getHandler(), ctx.getClass()]);
    if (!roles) return true;
    const user = ctx.switchToHttp().getRequest().user as AuthUser | undefined;
    if (!user || !roles.includes(user.role)) throw new ForbiddenException('Your role is not allowed to do this.');
    return true;
  }
}
