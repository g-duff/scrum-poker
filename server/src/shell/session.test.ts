import { describe, expect, it } from 'vitest';
import type { Session } from '@scrum-poker/shared';
import { createInMemorySessionStore } from '#src/shell/inMemorySessionStore';
import { findActiveSession } from '#src/shell/session';

const sessionId = '123e4567-e89b-12d3-a456-426614174000';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: sessionId,
    deck: ['1'],
    state: 'voting',
    roundNumber: 1,
    expiresAt: new Date(Date.now() + 60_000),
    participants: [],
    votes: [],
    ...overrides,
  };
}

describe('findActiveSession', () => {
  it('returns null for a malformed id', async () => {
    const store = createInMemorySessionStore();

    await expect(findActiveSession(store, 'not-a-uuid')).resolves.toBeNull();
  });

  it('returns null for an unknown session', async () => {
    const store = createInMemorySessionStore();

    await expect(findActiveSession(store, sessionId)).resolves.toBeNull();
  });

  it('returns null for an expired session', async () => {
    const store = createInMemorySessionStore();
    await store.create(makeSession({ expiresAt: new Date(Date.now() - 1000) }));

    await expect(findActiveSession(store, sessionId)).resolves.toBeNull();
  });

  it('returns the session when it exists and has not expired', async () => {
    const store = createInMemorySessionStore();
    await store.create(makeSession());

    await expect(findActiveSession(store, sessionId)).resolves.toMatchObject({
      id: sessionId,
    });
  });
});
