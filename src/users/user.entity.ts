import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Crop } from '../crops/crop.entity';
import type { Role } from '../common/auth';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  full_name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  // Hashed with bcrypt. Excluded from queries unless asked for (login only).
  @Column({ type: 'varchar', length: 100, select: false })
  password_hash: string;

  @Column({ type: 'enum', enum: ['farmer', 'admin'], enumName: 'user_role' })
  role: Role;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @OneToMany(() => Crop, (crop) => crop.user)
  crops: Crop[];
}
