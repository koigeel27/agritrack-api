import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard, RolesGuard } from './common/auth';
import { User } from './users/user.entity';
import { Crop } from './crops/crop.entity';
import { Harvest } from './harvests/harvest.entity';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CropsModule } from './crops/crops.module';
import { HarvestsModule } from './harvests/harvests.module';
import { SeedService } from './seed/seed.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env) => {
        // Refuse to start in production with a missing or placeholder secret.
        if (env.NODE_ENV === 'production' && (!env.JWT_SECRET || env.JWT_SECRET.length < 32 || env.JWT_SECRET.startsWith('change-me'))) {
          throw new Error('JWT_SECRET must be set to a random string of at least 32 characters in production.');
        }
        return { JWT_SECRET: 'dev-only-secret-do-not-use-in-production', ...env };
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.get('DATABASE_URL', 'postgres://agritrack:agritrack@localhost:5432/agritrack'),
        ssl: config.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        entities: [User, Crop, Harvest],
        synchronize: config.get('DB_SYNC', 'true') !== 'false',
      }),
    }),
    AuthModule,
    UsersModule,
    CropsModule,
    HarvestsModule,
    TypeOrmModule.forFeature([User, Crop, Harvest]),
  ],
  providers: [
    SeedService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
