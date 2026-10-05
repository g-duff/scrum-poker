import { describe, expect, it } from 'vitest';
import type { Session } from '@scrum-poker/shared';
import { createNewSession, isSessionExpired } from '#src/core/session';

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

describe('isSessionExpired', () => {
  function makeSession(expiresAt: Date): Session {
    return {
      id: 's1',
      deck: ['1'],
      state: 'voting',
      roundNumber: 1,
      expiresAt,
      participants: [],
      votes: [],
    };
  }

  it('is false while expiresAt is in the future', () => {
    const now = new Date('2024-01-01T00:00:00Z');
    expect(isSessionExpired(makeSession(new Date('2024-01-01T01:00:00Z')), now)).toBe(
      false,
    );
  });

  it('is true once expiresAt has passed', () => {
    const now = new Date('2024-01-01T01:00:00Z');
    expect(isSessionExpired(makeSession(new Date('2024-01-01T00:00:00Z')), now)).toBe(
      true,
    );
  });

  it('is true exactly at expiresAt', () => {
    const now = new Date('2024-01-01T00:00:00Z');
    expect(isSessionExpired(makeSession(now), now)).toBe(true);
  });
});
