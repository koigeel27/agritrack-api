import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Harvest } from '../harvests/harvest.entity';

export const CATEGORIES = ['Vegetable', 'Fruit', 'Grain', 'Root crop'] as const;
export type Category = (typeof CATEGORIES)[number];

@Entity('crops')
@Check('name_min_length', 'char_length(trim(name)) >= 2')
export class Crop {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  user_id: number;

  // RESTRICT: a user who still owns crops cannot be deleted.
  @ManyToOne(() => User, (user) => user.crops, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'enum', enum: CATEGORIES, enumName: 'crop_category' })
  category: Category;

  @Column({ type: 'date' })
  planted_on: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  field_location: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @OneToMany(() => Harvest, (harvest) => harvest.crop)
  harvests: Harvest[];
}
