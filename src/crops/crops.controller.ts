import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CropsService } from './crops.service';
import { CreateCropDto, UpdateCropDto } from './dto/crop.dto';
import { AuthUser, CurrentUser, Roles } from '../common/auth';

@ApiTags('Crops')
@ApiBearerAuth()
@Controller('crops')
export class CropsController {
  constructor(private readonly service: CropsService) {}

  @Get()
  @ApiOperation({ summary: 'List crops (farmer: own crops, admin: all)' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.service.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one crop' })
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(user, id);
  }

  @Post()
  @Roles('farmer')
  @ApiOperation({ summary: 'Add a crop (farmer only)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateCropDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  @Roles('farmer')
  @ApiOperation({ summary: 'Edit own crop (farmer only)' })
  update(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCropDto) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('farmer')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete own crop (farmer only; blocked while it has harvests)' })
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(user, id);
  }
}
