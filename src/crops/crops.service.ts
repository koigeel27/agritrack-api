import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Crop } from './crop.entity';
import { CreateCropDto, UpdateCropDto } from './dto/crop.dto';
import { Harvest } from '../harvests/harvest.entity';
import { AuthUser } from '../common/auth';
import { apiError, validationError } from '../common/errors';

// The shape the frontend already uses (see docs/API_CONTRACT.md).
export const toCropResponse = (c: Crop) => ({
  id: c.id,
  user_id: c.user_id,
  name: c.name,
  category: c.category,
  planted_on: c.planted_on,
  field_location: c.field_location ?? '',
  owner_name: c.user?.full_name ?? '',
  created_at: c.created_at,
});

@Injectable()
export class CropsService {
  constructor(
    @InjectRepository(Crop) private readonly crops: Repository<Crop>,
    @InjectRepository(Harvest) private readonly harvests: Repository<Harvest>,
  ) {}

  // Farmer: own crops. Admin: every farmer's crops.
  async findAll(user: AuthUser) {
    const rows = await this.crops.find({
      where: user.role === 'admin' ? {} : { user_id: user.id },
      relations: { user: true },
      order: { id: 'ASC' },
    });
    return rows.map(toCropResponse);
  }

  async findOne(user: AuthUser, id: number) {
    return toCropResponse(await this.load(user, id));
  }

  async create(user: AuthUser, dto: CreateCropDto) {
    const crop = await this.crops.save(
      this.crops.create({ ...dto, field_location: dto.field_location || null, user_id: user.id }),
    );
    return toCropResponse(await this.load(user, crop.id));
  }

  async update(user: AuthUser, id: number, dto: UpdateCropDto) {
    const crop = await this.load(user, id);
    if (dto.planted_on !== undefined) {
      // Keep the rule "no harvest before planting" true for harvests already logged.
      const first = await this.harvests.createQueryBuilder('h').select("to_char(MIN(h.harvest_date), 'YYYY-MM-DD')", 'first').where('h.crop_id = :id', { id }).getRawOne();
      if (first?.first && first.first < dto.planted_on) {
        throw validationError({ planted_on: 'Planting date cannot be after a harvest already logged for this crop.' });
      }
    }
    const { field_location, ...rest } = dto;
    Object.assign(crop, rest);
    if (field_location !== undefined) crop.field_location = field_location || null;
    await this.crops.save(crop);
    return toCropResponse(await this.load(user, id));
  }

  async remove(user: AuthUser, id: number) {
    const crop = await this.load(user, id);
    if (await this.harvests.exist({ where: { crop_id: id } })) {
      throw apiError(HttpStatus.CONFLICT, 'CONFLICT', 'This crop still has harvests. Delete them first.');
    }
    await this.crops.remove(crop);
  }

  // A farmer asking for someone else's crop gets 404, so ids of other people's data are not revealed.
  private async load(user: AuthUser, id: number) {
    const crop = await this.crops.findOne({ where: { id }, relations: { user: true } });
    if (!crop || (user.role !== 'admin' && crop.user_id !== user.id)) throw new NotFoundException('Crop not found.');
    return crop;
  }
}
