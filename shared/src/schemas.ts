import { z } from 'zod';

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((char) => {
    const codePoint = char.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}

export const displayNameSchema = z
  .string()
  .transform((value) => value.trim().replace(/\s+/g, ' '))
  .pipe(
    z
      .string()
      .min(1)
      .max(30)
      .refine((value) => !hasControlCharacter(value)),
  );

export const cardSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.string().min(1));

export const deckSchema = z
  .array(cardSchema)
  .min(1)
  .refine((deck) => new Set(deck).size === deck.length);

export const createSessionBodySchema = z.object({
  deck: deckSchema.optional(),
});

export const joinParticipantBodySchema = z.object({
  displayName: displayNameSchema,
});

export const roundSchema = z.number().int().min(1);

export const voteBodySchema = z.object({
  round: roundSchema,
  value: z.string().min(1),
});

export const roundQuerySchema = z.coerce.number().int().min(1);
