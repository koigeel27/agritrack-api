import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthUser, CurrentUser, Public } from '../common/auth';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  // Slows down password guessing: a limited number of attempts per minute per IP.
  @Throttle({ default: { limit: () => Number(process.env.LOGIN_RATE_LIMIT ?? 10), ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in and receive a JWT' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'The signed-in user' })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
