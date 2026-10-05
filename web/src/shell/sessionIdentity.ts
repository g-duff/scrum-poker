export interface SessionIdentity {
  participantId: string;
  token: string;
}

export interface SessionIdentityStore {
  get(sessionId: string): SessionIdentity | null;
  set(sessionId: string, identity: SessionIdentity): void;
  clear(sessionId: string): void;
}

function storageKey(sessionId: string): string {
  return `scrum-poker:session:${sessionId}`;
}

function isSessionIdentity(value: unknown): value is SessionIdentity {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).participantId === 'string' &&
    typeof (value as Record<string, unknown>).token === 'string'
  );
}

export function createLocalStorageSessionIdentityStore(
  storage: Storage = window.localStorage,
): SessionIdentityStore {
  function get(sessionId: string): SessionIdentity | null {
    const raw = storage.getItem(storageKey(sessionId));
    if (raw === null) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }

    return isSessionIdentity(parsed) ? parsed : null;
  }

  function set(sessionId: string, identity: SessionIdentity): void {
    storage.setItem(storageKey(sessionId), JSON.stringify(identity));
  }

  function clear(sessionId: string): void {
    storage.removeItem(storageKey(sessionId));
  }

  return { get, set, clear };
}
