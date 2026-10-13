import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { trim } from '../../common/validators';

const NAME = 'Full name is required (max 100 characters).';
const PASSWORD = 'Password must be 8 to 72 characters.';
const lower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

export class CreateUserDto {
  @Transform(trim)
  @IsString({ message: NAME })
  @MinLength(1, { message: NAME })
  @MaxLength(100, { message: NAME })
  full_name: string;

  @Transform(lower)
  @IsEmail({}, { message: 'Enter a valid email address.' })
  @MaxLength(255)
  email: string;

  // bcrypt only uses the first 72 bytes, so longer passwords are refused rather than silently cut.
  @IsString({ message: PASSWORD })
  @MinLength(8, { message: PASSWORD })
  @MaxLength(72, { message: PASSWORD })
  password: string;

  @IsIn(['farmer', 'admin'], { message: 'Role must be farmer or admin.' })
  role: 'farmer' | 'admin';
}

export class UpdateUserDto {
  @IsOptional()
  @Transform(trim)
  @IsString({ message: NAME })
  @MinLength(1, { message: NAME })
  @MaxLength(100, { message: NAME })
  full_name?: string;

  @IsOptional()
  @IsString({ message: PASSWORD })
  @MinLength(8, { message: PASSWORD })
  @MaxLength(72, { message: PASSWORD })
  password?: string;

  @IsOptional()
  @IsIn(['farmer', 'admin'], { message: 'Role must be farmer or admin.' })
  role?: 'farmer' | 'admin';
}
