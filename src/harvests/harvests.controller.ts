import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { HarvestsService } from './harvests.service';
import { CreateHarvestDto, UpdateHarvestDto } from './dto/harvest.dto';
import { AuthUser, CurrentUser, Roles } from '../common/auth';

@ApiTags('Harvests')
@ApiBearerAuth()
@Controller('harvests')
export class HarvestsController {
  constructor(private readonly service: HarvestsService) {}

  @Get()
  @ApiOperation({ summary: 'List harvests, newest first (farmer: own, admin: all)' })
  @ApiQuery({ name: 'crop_id', required: false, type: Number })
  findAll(@CurrentUser() user: AuthUser, @Query('crop_id') cropId?: string) {
    return this.service.findAll(user, Number(cropId) || undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one harvest' })
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(user, id);
  }

  @Post()
  @Roles('farmer')
  @ApiOperation({ summary: 'Log a harvest for one of your crops (farmer only)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateHarvestDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  @Roles('farmer')
  @ApiOperation({ summary: 'Edit own harvest (farmer only)' })
  update(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateHarvestDto) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('farmer')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete own harvest (farmer only)' })
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(user, id);
  }
}
