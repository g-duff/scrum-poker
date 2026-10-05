import { describe, expect, it } from 'vitest';
import { resolveDisplayName } from '#src/core/names';

describe('resolveDisplayName', () => {
  it('returns the name unchanged when it is not taken', () => {
    expect(resolveDisplayName('Ana', [])).toBe('Ana');
  });

  it('suffixes a duplicate name with (2)', () => {
    expect(resolveDisplayName('Ana', ['Ana'])).toBe('Ana (2)');
  });

  it('matches duplicates case-insensitively', () => {
    expect(resolveDisplayName('Ana', ['ANA'])).toBe('Ana (2)');
  });

  it('finds the lowest unused suffix', () => {
    expect(resolveDisplayName('Ana', ['Ana', 'Ana (2)'])).toBe('Ana (3)');
  });

  it('leaves the name unchanged when it does not match any existing name', () => {
    expect(resolveDisplayName('Ana', ['Raj', 'Mei'])).toBe('Ana');
  });
});
