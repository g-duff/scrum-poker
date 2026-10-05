import { describe, expect, it, vi } from 'vitest';
import type { SessionSnapshot } from '@scrum-poker/shared';
import {
  createSseSessionConnection,
  type EventSourceLike,
} from '#src/shell/sseSessionConnection';

class FakeEventSource implements EventSourceLike {
  readonly url: string;
  closed = false;
  private readonly listeners = new Set<(event: MessageEvent<string>) => void>();

  constructor(url: string) {
    this.url = url;
  }

  addEventListener(
    _type: 'snapshot',
    listener: (event: MessageEvent<string>) => void,
  ): void {
    this.listeners.add(listener);
  }

  close(): void {
    this.closed = true;
  }

  emit(data: unknown): void {
    const event = { data: JSON.stringify(data) } as MessageEvent<string>;
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

function makeSnapshot(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    id: 's1',
    round: 1,
    state: 'voting',
    deck: ['1', '2'],
    participants: [],
    ...overrides,
  };
}

describe('createSseSessionConnection', () => {
  it('connects to the events URL with the token', () => {
    const sources: FakeEventSource[] = [];
    const connection = createSseSessionConnection((url) => {
      const source = new FakeEventSource(url);
      sources.push(source);
      return source;
    });

    connection.connect('s1', 'tok en');

    expect(sources).toHaveLength(1);
    expect(sources[0]?.url).toBe('/api/sessions/s1/events?token=tok%20en');
  });

  it('notifies subscribers when a snapshot event arrives', () => {
    let source: FakeEventSource | undefined;
    const connection = createSseSessionConnection((url) => {
      source = new FakeEventSource(url);
      return source;
    });
    const handler = vi.fn();
    connection.onSnapshot(handler);

    connection.connect('s1', 'token');
    source?.emit(makeSnapshot());

    expect(handler).toHaveBeenCalledWith(makeSnapshot());
  });

  it('notifies every subscriber', () => {
    let source: FakeEventSource | undefined;
    const connection = createSseSessionConnection((url) => {
      source = new FakeEventSource(url);
      return source;
    });
    const first = vi.fn();
    const second = vi.fn();
    connection.onSnapshot(first);
    connection.onSnapshot(second);

    connection.connect('s1', 'token');
    source?.emit(makeSnapshot());

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('stops notifying a handler once unsubscribed', () => {
    let source: FakeEventSource | undefined;
    const connection = createSseSessionConnection((url) => {
      source = new FakeEventSource(url);
      return source;
    });
    const handler = vi.fn();
    const unsubscribe = connection.onSnapshot(handler);

    connection.connect('s1', 'token');
    unsubscribe();
    source?.emit(makeSnapshot());

    expect(handler).not.toHaveBeenCalled();
  });

  it('closes the previous connection when connecting again', () => {
    const sources: FakeEventSource[] = [];
    const connection = createSseSessionConnection((url) => {
      const source = new FakeEventSource(url);
      sources.push(source);
      return source;
    });

    connection.connect('s1', 'token');
    connection.connect('s2', 'token');

    expect(sources[0]?.closed).toBe(true);
    expect(sources[1]?.closed).toBe(false);
  });

  it('closes the connection on close()', () => {
    let source: FakeEventSource | undefined;
    const connection = createSseSessionConnection((url) => {
      source = new FakeEventSource(url);
      return source;
    });

    connection.connect('s1', 'token');
    connection.close();

    expect(source?.closed).toBe(true);
  });
});
