import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Crop } from '../crops/crop.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Crop])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
