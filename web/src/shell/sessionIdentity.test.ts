import { describe, expect, it } from 'vitest';
import { createLocalStorageSessionIdentityStore } from '#src/shell/sessionIdentity';

class FakeStorage implements Storage {
  private readonly data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }
}

describe('createLocalStorageSessionIdentityStore', () => {
  it('returns null when nothing is stored for a session', () => {
    const store = createLocalStorageSessionIdentityStore(new FakeStorage());

    expect(store.get('s1')).toBeNull();
  });

  it('round-trips an identity through set and get', () => {
    const store = createLocalStorageSessionIdentityStore(new FakeStorage());
    const identity = { participantId: 'p1', token: 'tok' };

    store.set('s1', identity);

    expect(store.get('s1')).toEqual(identity);
  });

  it('keeps identities for different sessions separate', () => {
    const store = createLocalStorageSessionIdentityStore(new FakeStorage());

    store.set('s1', { participantId: 'p1', token: 'tok1' });
    store.set('s2', { participantId: 'p2', token: 'tok2' });

    expect(store.get('s1')).toEqual({ participantId: 'p1', token: 'tok1' });
    expect(store.get('s2')).toEqual({ participantId: 'p2', token: 'tok2' });
  });

  it('removes the identity on clear', () => {
    const store = createLocalStorageSessionIdentityStore(new FakeStorage());
    store.set('s1', { participantId: 'p1', token: 'tok' });

    store.clear('s1');

    expect(store.get('s1')).toBeNull();
  });

  it('treats corrupted JSON as no identity', () => {
    const storage = new FakeStorage();
    storage.setItem('scrum-poker:session:s1', 'not json');
    const store = createLocalStorageSessionIdentityStore(storage);

    expect(store.get('s1')).toBeNull();
  });

  it('treats a stored value of the wrong shape as no identity', () => {
    const storage = new FakeStorage();
    storage.setItem('scrum-poker:session:s1', JSON.stringify({ foo: 'bar' }));
    const store = createLocalStorageSessionIdentityStore(storage);

    expect(store.get('s1')).toBeNull();
  });
});
