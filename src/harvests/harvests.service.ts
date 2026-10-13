import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Harvest } from './harvest.entity';
import { Crop } from '../crops/crop.entity';
import { CreateHarvestDto, UpdateHarvestDto } from './dto/harvest.dto';
import { AuthUser } from '../common/auth';
import { validationError } from '../common/errors';

export const toHarvestResponse = (h: Harvest) => ({
  id: h.id,
  crop_id: h.crop_id,
  crop_name: h.crop?.name ?? '',
  harvest_date: h.harvest_date,
  quantity_kg: h.quantity_kg,
  notes: h.notes ?? '',
  owner_name: h.crop?.user?.full_name ?? '',
  created_at: h.created_at,
});

@Injectable()
export class HarvestsService {
  constructor(
    @InjectRepository(Harvest) private readonly harvests: Repository<Harvest>,
    @InjectRepository(Crop) private readonly crops: Repository<Crop>,
  ) {}

  // Farmer: harvests of own crops. Admin: all. Optional ?crop_id= filter. Newest first.
  async findAll(user: AuthUser, cropId?: number) {
    const rows = await this.harvests.find({
      where: {
        ...(cropId ? { crop_id: cropId } : {}),
        ...(user.role === 'admin' ? {} : { crop: { user_id: user.id } }),
      },
      relations: { crop: { user: true } },
      order: { harvest_date: 'DESC', id: 'DESC' },
    });
    return rows.map(toHarvestResponse);
  }

  async findOne(user: AuthUser, id: number) {
    return toHarvestResponse(await this.load(user, id));
  }

  async create(user: AuthUser, dto: CreateHarvestDto) {
    const crop = await this.ownCrop(user, dto.crop_id);
    this.checkDate(dto.harvest_date, crop);
    const saved = await this.harvests.save(
      this.harvests.create({ ...dto, notes: dto.notes || null }),
    );
    return toHarvestResponse(await this.load(user, saved.id));
  }

  async update(user: AuthUser, id: number, dto: UpdateHarvestDto) {
    const harvest = await this.load(user, id);
    const crop = dto.crop_id !== undefined ? await this.ownCrop(user, dto.crop_id) : harvest.crop;
    this.checkDate(dto.harvest_date ?? harvest.harvest_date, crop);
    const { notes, ...rest } = dto;
    Object.assign(harvest, rest);
    if (notes !== undefined) harvest.notes = notes || null;
    harvest.crop = crop;
    harvest.crop_id = crop.id;
    await this.harvests.save(harvest);
    return toHarvestResponse(await this.load(user, id));
  }

  async remove(user: AuthUser, id: number) {
    await this.harvests.remove(await this.load(user, id));
  }

  private async ownCrop(user: AuthUser, cropId: number) {
    const crop = await this.crops.findOne({ where: { id: cropId, user_id: user.id } });
    if (!crop) throw validationError({ crop_id: 'Choose one of your crops.' });
    return crop;
  }

  private checkDate(date: string, crop: Crop) {
    if (date < crop.planted_on) throw validationError({ harvest_date: 'Harvest date cannot be before the planting date.' });
  }

  private async load(user: AuthUser, id: number) {
    const harvest = await this.harvests.findOne({ where: { id }, relations: { crop: { user: true } } });
    if (!harvest || (user.role !== 'admin' && harvest.crop.user_id !== user.id)) throw new NotFoundException('Harvest not found.');
    return harvest;
  }
}
