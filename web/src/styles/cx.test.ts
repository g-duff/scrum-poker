import { describe, expect, it } from 'vitest';
import { cx } from '#src/styles/cx';

describe('cx', () => {
  it('joins truthy class names with a space', () => {
    expect(cx('a', 'b')).toBe('a b');
  });

  it('drops undefined, null and false entries', () => {
    expect(cx('a', undefined, 'b', null, false, 'c')).toBe('a b c');
  });

  it('returns an empty string when nothing is truthy', () => {
    expect(cx(undefined, null, false)).toBe('');
  });
});
