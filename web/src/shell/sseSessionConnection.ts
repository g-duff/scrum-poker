import type { SessionSnapshot } from '@scrum-poker/shared';
import type { SessionConnection } from '#src/shell/sessionConnection';

export interface EventSourceLike {
  addEventListener(
    type: 'snapshot',
    listener: (event: MessageEvent<string>) => void,
  ): void;
  close(): void;
}
type EventSourceFactory = (url: string) => EventSourceLike;

const defaultEventSourceFactory: EventSourceFactory = (url) =>
  new EventSource(url);

export function createSseSessionConnection(
  createEventSource: EventSourceFactory = defaultEventSourceFactory,
): SessionConnection {
  let eventSource: EventSourceLike | null = null;
  const handlers = new Set<(snapshot: SessionSnapshot) => void>();

  function connect(sessionId: string, token: string): void {
    close();
    const url = `/api/sessions/${sessionId}/events?token=${encodeURIComponent(token)}`;
    const source = createEventSource(url);
    source.addEventListener('snapshot', (event) => {
      const snapshot = JSON.parse(event.data) as SessionSnapshot;
      for (const handler of handlers) {
        handler(snapshot);
      }
    });
    eventSource = source;
  }

  function onSnapshot(
    handler: (snapshot: SessionSnapshot) => void,
  ): () => void {
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
    };
  }

  function close(): void {
    eventSource?.close();
    eventSource = null;
  }

  return { connect, onSnapshot, close };
}
