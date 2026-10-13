import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Crop } from '../crops/crop.entity';
import { decimalTransformer } from '../common/decimal.transformer';

@Entity('harvests')
@Check('quantity_positive', 'quantity_kg > 0')
export class Harvest {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  crop_id: number;

  @ManyToOne(() => Crop, (crop) => crop.harvests, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'crop_id' })
  crop: Crop;

  @Column({ type: 'date' })
  harvest_date: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimalTransformer })
  quantity_kg: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
