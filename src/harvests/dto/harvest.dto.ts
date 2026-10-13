import { Transform, Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { IsCalendarDate, IsNotFutureDate, trim } from '../../common/validators';

const QTY = 'Quantity must be greater than 0 kg.';

export class CreateHarvestDto {
  @Type(() => Number)
  @IsInt({ message: 'Choose one of your crops.' })
  crop_id: number;

  @IsNotFutureDate({ message: 'Harvest date cannot be in the future.' })
  @IsCalendarDate({ message: 'Enter the harvest date.' })
  harvest_date: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: QTY })
  @Min(0.01, { message: QTY })
  @Max(1000000, { message: 'Quantity is too large.' })
  quantity_kg: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500, { message: 'Notes are too long (max 500 characters).' })
  notes?: string;
}

// PATCH: any subset of the create fields.
export class UpdateHarvestDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Choose one of your crops.' })
  crop_id?: number;

  @IsOptional()
  @IsNotFutureDate({ message: 'Harvest date cannot be in the future.' })
  @IsCalendarDate({ message: 'Enter the harvest date.' })
  harvest_date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: QTY })
  @Min(0.01, { message: QTY })
  @Max(1000000, { message: 'Quantity is too large.' })
  quantity_kg?: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500, { message: 'Notes are too long (max 500 characters).' })
  notes?: string;
}
