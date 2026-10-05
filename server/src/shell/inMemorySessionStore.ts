import type { Session } from '@scrum-poker/shared';
import type { SessionStore } from '#src/shell/sessionStore';

// Guards against aliasing: callers must not be able to corrupt the store
// by mutating a session object they got from create()/get()/update(), or
// by mutating one after handing it to create(). A networked store would
// get this for free from serialization; here it must be explicit.
function cloneSession(session: Session): Session {
  return {
    ...session,
    deck: [...session.deck],
    participants: session.participants.map((participant) => ({
      ...participant,
    })),
    votes: session.votes.map((vote) => ({ ...vote })),
  };
}

export function createInMemorySessionStore(): SessionStore {
  const sessions = new Map<string, Session>();

  return {
    create(session) {
      sessions.set(session.id, cloneSession(session));
      return Promise.resolve();
    },

    get(id) {
      const session = sessions.get(id);
      return Promise.resolve(session ? cloneSession(session) : null);
    },

    // No lock is needed: nothing here is `async`, so the read and the
    // write below run as one synchronous pass with no event-loop gap in
    // between, even under Promise.all.
    update(id, fn) {
      const current = sessions.get(id);
      if (!current) {
        return Promise.reject(new Error(`Session not found: ${id}`));
      }
      const updated = fn(cloneSession(current));
      sessions.set(id, cloneSession(updated));
      return Promise.resolve(updated);
    },

    deleteExpired(now) {
      const expiredIds = [...sessions.values()]
        .filter((session) => session.expiresAt <= now)
        .map((session) => session.id);
      for (const id of expiredIds) {
        sessions.delete(id);
      }
      return Promise.resolve(expiredIds);
    },
  };
}
