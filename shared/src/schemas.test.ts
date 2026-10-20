import { describe, expect, it } from 'vitest';
import {
  createSessionBodySchema,
  deckSchema,
  displayNameSchema,
  joinParticipantBodySchema,
  roundQuerySchema,
  roundSchema,
  voteBodySchema,
} from '#src/schemas';

describe('displayNameSchema', () => {
  it('trims the ends and collapses inner whitespace', () => {
    expect(displayNameSchema.parse('  Ana   Ray  ')).toBe('Ana Ray');
  });

  it('rejects a name that is empty after trimming', () => {
    expect(() => displayNameSchema.parse('   ')).toThrow();
  });

  it('rejects a name over 30 characters', () => {
    expect(() => displayNameSchema.parse('a'.repeat(31))).toThrow();
  });

  it('rejects control characters', () => {
    expect(() => displayNameSchema.parse('Ana')).toThrow();
  });

  it('allows emoji', () => {
    expect(displayNameSchema.parse('Ana 🎲')).toBe('Ana 🎲');
  });
});

describe('deckSchema', () => {
  it('trims cards', () => {
    expect(deckSchema.parse([' 1 ', '2'])).toEqual(['1', '2']);
  });

  it('rejects an empty deck', () => {
    expect(() => deckSchema.parse([])).toThrow();
  });

  it('rejects a blank card', () => {
    expect(() => deckSchema.parse(['1', '   '])).toThrow();
  });

  it('rejects duplicate cards', () => {
    expect(() => deckSchema.parse(['1', '1'])).toThrow();
  });
});

describe('createSessionBodySchema', () => {
  it('allows an omitted deck', () => {
    expect(createSessionBodySchema.parse({})).toEqual({});
  });

  it('validates a provided deck', () => {
    expect(() => createSessionBodySchema.parse({ deck: [] })).toThrow();
  });
});

describe('joinParticipantBodySchema', () => {
  it('requires a display name', () => {
    expect(() => joinParticipantBodySchema.parse({})).toThrow();
  });

  it('accepts a valid display name', () => {
    expect(joinParticipantBodySchema.parse({ displayName: 'Ana' })).toEqual({
      displayName: 'Ana',
    });
  });
});

describe('roundSchema', () => {
  it('accepts a positive integer', () => {
    expect(roundSchema.parse(1)).toBe(1);
  });

  it('rejects zero', () => {
    expect(() => roundSchema.parse(0)).toThrow();
  });

  it('rejects a non-integer', () => {
    expect(() => roundSchema.parse(1.5)).toThrow();
  });
});

describe('voteBodySchema', () => {
  it('accepts a round and value', () => {
    expect(voteBodySchema.parse({ round: 1, value: '5' })).toEqual({
      round: 1,
      value: '5',
    });
  });

  it('rejects a missing value', () => {
    expect(() => voteBodySchema.parse({ round: 1 })).toThrow();
  });

  it('rejects an empty value', () => {
    expect(() => voteBodySchema.parse({ round: 1, value: '' })).toThrow();
  });

  it('rejects a non-integer round', () => {
    expect(() => voteBodySchema.parse({ round: 1.5, value: '5' })).toThrow();
  });
});

describe('roundQuerySchema', () => {
  it('coerces a numeric query string', () => {
    expect(roundQuerySchema.parse('1')).toBe(1);
  });

  it('rejects a non-numeric query string', () => {
    expect(() => roundQuerySchema.parse('abc')).toThrow();
  });

  it('rejects zero', () => {
    expect(() => roundQuerySchema.parse('0')).toThrow();
  });
});
