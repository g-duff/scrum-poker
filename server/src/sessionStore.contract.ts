import { describe, expect, it } from 'vitest';
import type { Session } from '@scrum-poker/shared';
import type { SessionStore } from '#src/sessionStore';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session-1',
    deck: ['1', '2', '3'],
    state: 'voting',
    roundNumber: 1,
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  };
}

export function sessionStoreContractTests(
  createStore: () => SessionStore,
): void {
  describe('create and get', () => {
    it('returns the created session', async () => {
      const store = createStore();
      const session = makeSession();

      await store.create(session);

      await expect(store.get(session.id)).resolves.toEqual(session);
    });

    it('returns null for an unknown id', async () => {
      const store = createStore();

      await expect(store.get('unknown')).resolves.toBeNull();
    });
  });

  describe('update', () => {
    it('applies the function and returns the updated session', async () => {
      const store = createStore();
      await store.create(makeSession({ id: 's1', roundNumber: 1 }));

      const updated = await store.update('s1', (session) => ({
        ...session,
        roundNumber: session.roundNumber + 1,
      }));

      expect(updated.roundNumber).toBe(2);
      await expect(store.get('s1')).resolves.toEqual(updated);
    });

    it('rejects for an unknown id', async () => {
      const store = createStore();

      await expect(
        store.update('unknown', (session) => session),
      ).rejects.toThrow();
    });

    it('applies concurrent updates without losing any', async () => {
      const store = createStore();
      await store.create(makeSession({ id: 's1', roundNumber: 0 }));

      await Promise.all(
        Array.from({ length: 20 }, () =>
          store.update('s1', (session) => ({
            ...session,
            roundNumber: session.roundNumber + 1,
          })),
        ),
      );

      await expect(store.get('s1')).resolves.toMatchObject({
        roundNumber: 20,
      });
    });
  });

  describe('deleteExpired', () => {
    it('deletes sessions past their expiry and returns their ids', async () => {
      const store = createStore();
      const now = new Date('2024-01-01T00:00:00Z');
      await store.create(
        makeSession({
          id: 'expired',
          expiresAt: new Date('2023-12-31T23:00:00Z'),
        }),
      );
      await store.create(
        makeSession({
          id: 'fresh',
          expiresAt: new Date('2024-01-02T00:00:00Z'),
        }),
      );

      const deletedIds = await store.deleteExpired(now);

      expect(deletedIds).toEqual(['expired']);
      await expect(store.get('expired')).resolves.toBeNull();
      await expect(store.get('fresh')).resolves.not.toBeNull();
    });
  });
}
