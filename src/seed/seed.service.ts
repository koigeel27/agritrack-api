import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Crop } from '../crops/crop.entity';
import { Harvest } from '../harvests/harvest.entity';

// Loads the same demo data the frontend mock used, only when the database is empty.
// Turn off with SEED_DEMO_DATA=false (do this on a real deployment).
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Seed');

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Crop) private readonly crops: Repository<Crop>,
    @InjectRepository(Harvest) private readonly harvests: Repository<Harvest>,
  ) {}

  async onApplicationBootstrap() {
    if (this.config.get('SEED_DEMO_DATA', 'true') === 'false') return;
    if ((await this.users.count()) > 0) return;

    const hash = (p: string) => bcrypt.hashSync(p, 10);
    const [maria, pedro] = await this.users.save([
      { full_name: 'Maria Santos', email: 'farmer@agritrack.test', password_hash: hash('Farmer123!'), role: 'farmer' },
      { full_name: 'Pedro Dela Cruz', email: 'farmer2@agritrack.test', password_hash: hash('Farmer123!'), role: 'farmer' },
      { full_name: 'Coop Admin', email: 'admin@agritrack.test', password_hash: hash('Admin123!'), role: 'admin' },
    ]);
    const [corn, eggplant, banana, rice] = await this.crops.save([
      { user_id: maria.id, name: 'Sweet Corn', category: 'Grain', planted_on: '2026-07-15', field_location: 'North plot' },
      { user_id: maria.id, name: 'Eggplant', category: 'Vegetable', planted_on: '2026-08-01', field_location: 'River side' },
      { user_id: maria.id, name: 'Lakatan Banana', category: 'Fruit', planted_on: '2026-01-10', field_location: 'Hill block' },
      { user_id: pedro.id, name: 'Rice (Palay)', category: 'Grain', planted_on: '2026-06-20', field_location: 'Lowland field' },
    ]);
    await this.harvests.save([
      { crop_id: corn.id, harvest_date: '2026-09-28', quantity_kg: 420, notes: 'First picking, good size' },
      { crop_id: eggplant.id, harvest_date: '2026-10-02', quantity_kg: 85.5, notes: null },
      { crop_id: banana.id, harvest_date: '2026-10-05', quantity_kg: 310, notes: 'Sold to the coop' },
      { crop_id: corn.id, harvest_date: '2026-10-08', quantity_kg: 260, notes: 'Second picking' },
      { crop_id: rice.id, harvest_date: '2026-10-09', quantity_kg: 1200, notes: null },
    ]);
    this.logger.log('Demo data loaded (3 users, 4 crops, 5 harvests).');
  }
}
