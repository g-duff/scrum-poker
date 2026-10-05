import { describe, expect, it } from 'vitest';
import { createNewSession } from '#src/core/session';

describe('createNewSession', () => {
  it('builds a fresh voting session with no participants or votes', () => {
    const expiresAt = new Date('2024-01-01T01:00:00Z');

    expect(createNewSession('s1', ['1', '2'], expiresAt)).toEqual({
      id: 's1',
      deck: ['1', '2'],
      state: 'voting',
      roundNumber: 1,
      expiresAt,
      participants: [],
      votes: [],
    });
  });
});
