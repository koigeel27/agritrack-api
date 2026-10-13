import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CATEGORIES, Category } from '../crop.entity';
import { IsCalendarDate, IsNotFutureDate, trim } from '../../common/validators';

export class CreateCropDto {
  @Transform(trim)
  @IsString({ message: 'Crop name must be at least 2 characters.' })
  @MinLength(2, { message: 'Crop name must be at least 2 characters.' })
  @MaxLength(100, { message: 'Crop name is too long (max 100 characters).' })
  name: string;

  @IsIn(CATEGORIES, { message: 'Choose a category.' })
  category: Category;

  @IsNotFutureDate({ message: 'Planting date cannot be in the future.' })
  @IsCalendarDate({ message: 'Enter the planting date.' })
  planted_on: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120, { message: 'Field location is too long (max 120 characters).' })
  field_location?: string;
}

// PATCH: any subset of the create fields.
export class UpdateCropDto {
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'Crop name must be at least 2 characters.' })
  @MinLength(2, { message: 'Crop name must be at least 2 characters.' })
  @MaxLength(100, { message: 'Crop name is too long (max 100 characters).' })
  name?: string;

  @IsOptional()
  @IsIn(CATEGORIES, { message: 'Choose a category.' })
  category?: Category;

  @IsOptional()
  @IsNotFutureDate({ message: 'Planting date cannot be in the future.' })
  @IsCalendarDate({ message: 'Enter the planting date.' })
  planted_on?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120, { message: 'Field location is too long (max 120 characters).' })
  field_location?: string;
}
