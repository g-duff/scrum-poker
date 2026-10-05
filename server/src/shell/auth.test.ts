import { describe, expect, it } from 'vitest';
import type { Session } from '@scrum-poker/shared';
import { hashToken } from '#src/core/auth';
import { authenticateParticipant, generateToken } from '#src/shell/auth';
import { createInMemorySessionStore } from '#src/shell/inMemorySessionStore';

describe('generateToken', () => {
  it('returns a base64url string with no padding', () => {
    expect(generateToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('returns a different token on each call', () => {
    expect(generateToken()).not.toBe(generateToken());
  });
});

describe('authenticateParticipant', () => {
  const sessionId = '123e4567-e89b-12d3-a456-426614174000';

  async function createStoreWithParticipant(token: string) {
    const store = createInMemorySessionStore();
    const session: Session = {
      id: sessionId,
      deck: ['1', '2'],
      state: 'voting',
      roundNumber: 1,
      expiresAt: new Date(Date.now() + 60_000),
      participants: [
        {
          id: 'p1',
          sessionId,
          displayName: 'Ana',
          tokenHash: hashToken(token),
          lastSeenAt: new Date(),
        },
      ],
      votes: [],
    };
    await store.create(session);
    return store;
  }

  it('returns not_found for a malformed session id', async () => {
    const store = createInMemorySessionStore();

    const result = await authenticateParticipant(
      store,
      'not-a-uuid',
      'Bearer anything',
    );

    expect(result).toEqual({ outcome: 'not_found' });
  });

  it('returns not_found for an unknown session', async () => {
    const store = createInMemorySessionStore();

    const result = await authenticateParticipant(
      store,
      sessionId,
      'Bearer anything',
    );

    expect(result).toEqual({ outcome: 'not_found' });
  });

  it('returns not_found for an expired session', async () => {
    const store = createInMemorySessionStore();
    const token = 'ana-token';
    await store.create({
      id: sessionId,
      deck: ['1'],
      state: 'voting',
      roundNumber: 1,
      expiresAt: new Date(Date.now() - 1000),
      participants: [
        {
          id: 'p1',
          sessionId,
          displayName: 'Ana',
          tokenHash: hashToken(token),
          lastSeenAt: new Date(),
        },
      ],
      votes: [],
    });

    const result = await authenticateParticipant(
      store,
      sessionId,
      `Bearer ${token}`,
    );

    expect(result).toEqual({ outcome: 'not_found' });
  });

  it('returns unauthorized when the header is missing', async () => {
    const store = await createStoreWithParticipant('ana-token');

    const result = await authenticateParticipant(store, sessionId, undefined);

    expect(result).toEqual({ outcome: 'unauthorized' });
  });

  it('returns unauthorized when the header is not a Bearer token', async () => {
    const store = await createStoreWithParticipant('ana-token');

    const result = await authenticateParticipant(
      store,
      sessionId,
      'Basic ana-token',
    );

    expect(result).toEqual({ outcome: 'unauthorized' });
  });

  it('returns unauthorized for a token that matches no participant', async () => {
    const store = await createStoreWithParticipant('ana-token');

    const result = await authenticateParticipant(
      store,
      sessionId,
      'Bearer wrong-token',
    );

    expect(result).toEqual({ outcome: 'unauthorized' });
  });

  it('returns the participant for a matching token', async () => {
    const store = await createStoreWithParticipant('ana-token');

    const result = await authenticateParticipant(
      store,
      sessionId,
      'Bearer ana-token',
    );

    expect(result).toMatchObject({ outcome: 'ok', participantId: 'p1' });
  });
});
