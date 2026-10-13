import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Crop } from './crop.entity';
import { Harvest } from '../harvests/harvest.entity';
import { CropsController } from './crops.controller';
import { CropsService } from './crops.service';

@Module({
  imports: [TypeOrmModule.forFeature([Crop, Harvest])],
  controllers: [CropsController],
  providers: [CropsService],
})
export class CropsModule {}
