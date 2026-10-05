import { describe, expect, it } from 'vitest';
import type { Session } from '@scrum-poker/shared';
import { createInMemorySessionStore } from '#src/shell/inMemorySessionStore';
import { sessionStoreContractTests } from '#src/shell/sessionStore.contract';

sessionStoreContractTests(() => createInMemorySessionStore());

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 's1',
    deck: ['1', '2'],
    state: 'voting',
    roundNumber: 1,
    expiresAt: new Date(Date.now() + 60_000),
    participants: [],
    votes: [],
    ...overrides,
  };
}

describe('createInMemorySessionStore aliasing safety', () => {
  it('does not let a mutated get() result affect the stored session', async () => {
    const store = createInMemorySessionStore();
    await store.create(makeSession());

    const first = await store.get('s1');
    first?.deck.push('99');

    await expect(store.get('s1')).resolves.toMatchObject({ deck: ['1', '2'] });
  });

  it('does not let mutating the session passed to create() affect the store', async () => {
    const store = createInMemorySessionStore();
    const session = makeSession();
    await store.create(session);

    session.deck.push('99');

    await expect(store.get('s1')).resolves.toMatchObject({ deck: ['1', '2'] });
  });

  it('does not let mutating an update() result affect the stored session', async () => {
    const store = createInMemorySessionStore();
    await store.create(makeSession());

    const updated = await store.update('s1', (session) => session);
    updated.deck.push('99');

    await expect(store.get('s1')).resolves.toMatchObject({ deck: ['1', '2'] });
  });
});
