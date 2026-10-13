import { registerDecorator, ValidationOptions } from 'class-validator';
import { today } from './dates';

// A real calendar date written as YYYY-MM-DD (rejects 2026-02-31).
export function IsCalendarDate(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isCalendarDate',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
          const d = new Date(`${value}T00:00:00Z`);
          return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
        },
      },
    });
}

export const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// A YYYY-MM-DD date that is not after today. Passes for malformed input so IsCalendarDate reports that instead.
export function IsNotFutureDate(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isNotFutureDate',
      target: object.constructor,
      propertyName,
      options,
      validator: { validate: (value: unknown) => typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value <= today() },
    });
}
