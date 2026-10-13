import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Harvest } from './harvest.entity';
import { Crop } from '../crops/crop.entity';
import { HarvestsController } from './harvests.controller';
import { HarvestsService } from './harvests.service';

@Module({
  imports: [TypeOrmModule.forFeature([Harvest, Crop])],
  controllers: [HarvestsController],
  providers: [HarvestsService],
})
export class HarvestsModule {}
