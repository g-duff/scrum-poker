import { describe, expect, it } from 'vitest';
import { APP_NAME } from '#src/index';

describe('APP_NAME', () => {
  it('names the app', () => {
    expect(APP_NAME).toBe('Scrum Poker');
  });
});
