import { describe, expect, it } from 'vitest';
import type { Session } from '@scrum-poker/shared';
import {
  findParticipantByTokenHash,
  hashesMatch,
  hashToken,
  isValidUuid,
} from '#src/core/auth';

describe('isValidUuid', () => {
  it('accepts a well-formed UUID', () => {
    expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
  });

  it('rejects a malformed value', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false);
  });
});

describe('hashToken', () => {
  it('is deterministic', () => {
    expect(hashToken('secret')).toBe(hashToken('secret'));
  });

  it('differs for different tokens', () => {
    expect(hashToken('secret')).not.toBe(hashToken('different'));
  });
});

describe('hashesMatch', () => {
  it('matches equal hashes', () => {
    const hash = hashToken('secret');
    expect(hashesMatch(hash, hash)).toBe(true);
  });

  it('rejects differing hashes', () => {
    expect(hashesMatch(hashToken('secret'), hashToken('other'))).toBe(false);
  });

  it('rejects hashes of different lengths without throwing', () => {
    expect(hashesMatch(hashToken('secret'), 'ab')).toBe(false);
  });
});

describe('findParticipantByTokenHash', () => {
  function makeSession(overrides: Partial<Session> = {}): Session {
    return {
      id: 'session-1',
      deck: ['1', '2'],
      state: 'voting',
      roundNumber: 1,
      expiresAt: new Date(Date.now() + 60_000),
      participants: [],
      votes: [],
      ...overrides,
    };
  }

  it('finds the participant whose token hash matches', () => {
    const tokenHash = hashToken('ana-token');
    const session = makeSession({
      participants: [
        {
          id: 'p1',
          sessionId: 'session-1',
          displayName: 'Ana',
          tokenHash,
          lastSeenAt: new Date(),
        },
      ],
    });

    expect(findParticipantByTokenHash(session, tokenHash)?.id).toBe('p1');
  });

  it('returns null when no participant matches', () => {
    const session = makeSession();

    expect(findParticipantByTokenHash(session, hashToken('unknown'))).toBeNull();
  });
});
