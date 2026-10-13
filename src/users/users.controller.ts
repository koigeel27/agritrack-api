import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { AuthUser, CurrentUser, Roles } from '../common/auth';

@ApiTags('Users (admin)')
@ApiBearerAuth()
@Roles('admin')
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List accounts' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one account' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an account (how farmers get their login)' })
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit name, role or password' })
  update(@CurrentUser() actor: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.service.update(actor, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an account (blocked while it owns crops)' })
  remove(@CurrentUser() actor: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(actor, id);
  }
}
