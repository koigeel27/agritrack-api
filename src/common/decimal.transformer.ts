import { ValueTransformer } from 'typeorm';

// PostgreSQL returns DECIMAL as text; the API promises a JSON number.
export const decimalTransformer: ValueTransformer = {
  to: (v?: number) => v,
  from: (v?: string | null) => (v === null || v === undefined ? v : Number(v)),
};
