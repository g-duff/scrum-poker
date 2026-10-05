import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  SESSION_IDLE_SECONDS: z.coerce.number().int().positive().default(3600),
});

export const config = envSchema.parse(process.env);
