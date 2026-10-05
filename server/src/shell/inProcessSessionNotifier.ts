import type { SessionNotifier } from '#src/shell/sessionNotifier';

export function createInProcessSessionNotifier(): SessionNotifier {
  const listenersBySession = new Map<string, Set<() => void>>();

  return {
    notify(sessionId) {
      const listeners = listenersBySession.get(sessionId);
      if (listeners) {
        for (const listener of listeners) {
          listener();
        }
      }
      return Promise.resolve();
    },

    subscribe(sessionId, onChange) {
      const listeners =
        listenersBySession.get(sessionId) ?? new Set<() => void>();
      listeners.add(onChange);
      listenersBySession.set(sessionId, listeners);

      return () => {
        listeners.delete(onChange);
        if (listeners.size === 0) {
          listenersBySession.delete(sessionId);
        }
      };
    },
  };
}
