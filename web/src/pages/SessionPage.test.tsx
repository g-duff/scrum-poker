import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiResponse, SessionSnapshot } from '@scrum-poker/shared';
import { SessionPage } from '#src/pages/SessionPage';
import type { SessionConnection } from '#src/shell/sessionConnection';
import { createLocalStorageSessionIdentityStore } from '#src/shell/sessionIdentity';

class FakeSessionConnection implements SessionConnection {
  connectedWith: { sessionId: string; token: string } | null = null;
  closed = false;
  private readonly handlers = new Set<(snapshot: SessionSnapshot) => void>();

  connect(sessionId: string, token: string): void {
    this.connectedWith = { sessionId, token };
  }

  onSnapshot(handler: (snapshot: SessionSnapshot) => void): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  close(): void {
    this.closed = true;
  }

  emit(snapshot: SessionSnapshot): void {
    for (const handler of this.handlers) {
      handler(snapshot);
    }
  }
}

function renderSessionPage(
  connections: FakeSessionConnection[],
  sessionId = 's1',
) {
  return render(
    <MemoryRouter initialEntries={[`/s/${sessionId}`]}>
      <Routes>
        <Route path="/" element={<p>Home page</p>} />
        <Route
          path="/s/:id"
          element={
            <SessionPage
              createConnection={() => {
                const connection = new FakeSessionConnection();
                connections.push(connection);
                return connection;
              }}
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  );
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

function jsonResponse(body: unknown) {
  return { json: () => Promise.resolve(body) };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SessionPage', () => {
  it('shows the join form when there is no stored identity', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: null,
          error: { code: 'unauthorized', message: 'Missing or unknown token' },
        } satisfies ApiResponse<SessionSnapshot>),
      ),
    );

    renderSessionPage([]);

    await waitFor(() => {
      expect(screen.getByText('Join this session')).toBeInTheDocument();
    });
  });

  it('shows the not-found page when the session does not exist', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: null,
          error: { code: 'not_found', message: 'Session not found' },
        } satisfies ApiResponse<SessionSnapshot>),
      ),
    );

    renderSessionPage([]);

    await waitFor(() => {
      expect(screen.getByText('Session not found')).toBeInTheDocument();
    });
  });

  it('opens exactly one live connection and renders its snapshots when a valid identity is stored', async () => {
    createLocalStorageSessionIdentityStore().set('s1', {
      participantId: 'p1',
      token: 'tok',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: makeSnapshot(),
          error: null,
        } satisfies ApiResponse<SessionSnapshot>),
      ),
    );
    const connections: FakeSessionConnection[] = [];

    renderSessionPage(connections);

    await waitFor(() => {
      expect(connections).toHaveLength(1);
    });
    expect(connections[0]?.connectedWith).toEqual({
      sessionId: 's1',
      token: 'tok',
    });
    expect(screen.getByText('Loading session...')).toBeInTheDocument();

    connections[0]?.emit(
      makeSnapshot({
        participants: [
          { id: 'p1', name: 'Ana', active: true, hasVoted: false },
          { id: 'p2', name: 'Raj', active: false, hasVoted: true },
        ],
      }),
    );

    await waitFor(() => {
      expect(screen.getByText('Voting')).toBeInTheDocument();
    });
    expect(screen.getByText(/Ana \(you\)/)).toBeInTheDocument();
    expect(screen.getByText(/not voted/)).toBeInTheDocument();
    const raj = screen.getByText('Raj').closest('div');
    expect(raj).toHaveTextContent('(inactive)');
  });

  it('shows the deck as pickable cards', async () => {
    createLocalStorageSessionIdentityStore().set('s1', {
      participantId: 'p1',
      token: 'tok',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: makeSnapshot(),
          error: null,
        } satisfies ApiResponse<SessionSnapshot>),
      ),
    );
    const connections: FakeSessionConnection[] = [];

    renderSessionPage(connections);
    await waitFor(() => {
      expect(connections).toHaveLength(1);
    });
    connections[0]?.emit(makeSnapshot({ deck: ['1', '2', '3'] }));

    await waitFor(() => {
      expect(screen.getByText('Pick a card')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
  });

  it('hides the card picker once the round is revealed', async () => {
    createLocalStorageSessionIdentityStore().set('s1', {
      participantId: 'p1',
      token: 'tok',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: makeSnapshot(),
          error: null,
        } satisfies ApiResponse<SessionSnapshot>),
      ),
    );
    const connections: FakeSessionConnection[] = [];

    renderSessionPage(connections);
    await waitFor(() => {
      expect(connections).toHaveLength(1);
    });
    connections[0]?.emit(makeSnapshot({ state: 'revealed' }));

    await waitFor(() => {
      expect(screen.getByText('Revealed')).toBeInTheDocument();
    });
    expect(screen.queryByText('Pick a card')).not.toBeInTheDocument();
  });

  it('casts a vote when a card is clicked', async () => {
    createLocalStorageSessionIdentityStore().set('s1', {
      participantId: 'p1',
      token: 'tok',
    });
    const putRequests: { url: string; body: unknown }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        (input: string, init?: RequestInit) => {
          if (init?.method === 'PUT') {
            putRequests.push({
              url: input,
              body: JSON.parse(init.body as string),
            });
            return Promise.resolve(
              jsonResponse({ data: null, error: null } satisfies ApiResponse<null>),
            );
          }
          return Promise.resolve(
            jsonResponse({
              data: makeSnapshot(),
              error: null,
            } satisfies ApiResponse<SessionSnapshot>),
          );
        },
      ),
    );
    const connections: FakeSessionConnection[] = [];

    renderSessionPage(connections);
    await waitFor(() => {
      expect(connections).toHaveLength(1);
    });
    connections[0]?.emit(makeSnapshot({ deck: ['1', '2', '3'] }));
    await waitFor(() => {
      expect(screen.getByText('Pick a card')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '2' }));

    await waitFor(() => {
      expect(putRequests).toEqual([
        { url: '/api/sessions/s1/votes/me', body: { round: 1, value: '2' } },
      ]);
    });
  });

  it('highlights the selected card and clears it', async () => {
    createLocalStorageSessionIdentityStore().set('s1', {
      participantId: 'p1',
      token: 'tok',
    });
    const deleteRequests: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        (input: string, init?: RequestInit) => {
          if (init?.method === 'DELETE') {
            deleteRequests.push(input);
            return Promise.resolve(
              jsonResponse({ data: null, error: null } satisfies ApiResponse<null>),
            );
          }
          return Promise.resolve(
            jsonResponse({
              data: makeSnapshot(),
              error: null,
            } satisfies ApiResponse<SessionSnapshot>),
          );
        },
      ),
    );
    const connections: FakeSessionConnection[] = [];

    renderSessionPage(connections);
    await waitFor(() => {
      expect(connections).toHaveLength(1);
    });
    connections[0]?.emit(
      makeSnapshot({ deck: ['1', '2'], yourVote: '2' }),
    );
    await waitFor(() => {
      expect(screen.getByText('Pick a card')).toBeInTheDocument();
    });

    const selectedCard = screen.getByRole('button', { name: '2' });
    expect(selectedCard).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Clear my vote' }));

    await waitFor(() => {
      expect(deleteRequests).toEqual(['/api/sessions/s1/votes/me?round=1']);
    });
  });

  it('shows an error message when a vote is rejected', async () => {
    createLocalStorageSessionIdentityStore().set('s1', {
      participantId: 'p1',
      token: 'tok',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        (_input: RequestInfo | URL, init?: RequestInit) => {
          if (init?.method === 'PUT') {
            return Promise.resolve(
              jsonResponse({
                data: null,
                error: {
                  code: 'invalid_card',
                  message: 'Vote value is not a card in the deck',
                },
              } satisfies ApiResponse<null>),
            );
          }
          return Promise.resolve(
            jsonResponse({
              data: makeSnapshot(),
              error: null,
            } satisfies ApiResponse<SessionSnapshot>),
          );
        },
      ),
    );
    const connections: FakeSessionConnection[] = [];

    renderSessionPage(connections);
    await waitFor(() => {
      expect(connections).toHaveLength(1);
    });
    connections[0]?.emit(makeSnapshot({ deck: ['1', '2'] }));
    await waitFor(() => {
      expect(screen.getByText('Pick a card')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '2' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Vote value is not a card in the deck',
      );
    });
  });

  it('resyncs the snapshot on a stale round error', async () => {
    createLocalStorageSessionIdentityStore().set('s1', {
      participantId: 'p1',
      token: 'tok',
    });
    const resyncedSnapshot = makeSnapshot({
      round: 2,
      participants: [{ id: 'p2', name: 'Mei', active: true, hasVoted: false }],
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        (_input: RequestInfo | URL, init?: RequestInit) => {
          if (init?.method === 'PUT') {
            return Promise.resolve(
              jsonResponse({
                data: null,
                error: {
                  code: 'stale_round',
                  message: 'Round is stale',
                  details: { snapshot: resyncedSnapshot },
                },
              } satisfies ApiResponse<null>),
            );
          }
          return Promise.resolve(
            jsonResponse({
              data: makeSnapshot(),
              error: null,
            } satisfies ApiResponse<SessionSnapshot>),
          );
        },
      ),
    );
    const connections: FakeSessionConnection[] = [];

    renderSessionPage(connections);
    await waitFor(() => {
      expect(connections).toHaveLength(1);
    });
    connections[0]?.emit(makeSnapshot({ deck: ['1', '2'] }));
    await waitFor(() => {
      expect(screen.getByText('Pick a card')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '2' }));

    await waitFor(() => {
      expect(screen.getByText('Mei')).toBeInTheDocument();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('closes the live connection on unmount', async () => {
    createLocalStorageSessionIdentityStore().set('s1', {
      participantId: 'p1',
      token: 'tok',
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: makeSnapshot(),
          error: null,
        } satisfies ApiResponse<SessionSnapshot>),
      ),
    );
    const connections: FakeSessionConnection[] = [];

    const { unmount } = renderSessionPage(connections);
    await waitFor(() => {
      expect(connections).toHaveLength(1);
    });

    unmount();

    expect(connections[0]?.closed).toBe(true);
  });

  it('joins, stores the identity, and opens a live connection', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        if (typeof input === 'string' && input.endsWith('/participants')) {
          return Promise.resolve(
            jsonResponse({
              data: { participantId: 'p1', token: 'tok', displayName: 'Ana' },
              error: null,
            } satisfies ApiResponse<{
              participantId: string;
              token: string;
              displayName: string;
            }>),
          );
        }
        return Promise.resolve(
          jsonResponse({
            data: null,
            error: {
              code: 'unauthorized',
              message: 'Missing or unknown token',
            },
          } satisfies ApiResponse<SessionSnapshot>),
        );
      }),
    );
    const connections: FakeSessionConnection[] = [];

    renderSessionPage(connections);
    await waitFor(() => {
      expect(screen.getByText('Join this session')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Your name'), {
      target: { value: 'Ana' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Join' }));

    await waitFor(() => {
      expect(connections).toHaveLength(1);
    });
    expect(connections[0]?.connectedWith).toEqual({
      sessionId: 's1',
      token: 'tok',
    });
    expect(createLocalStorageSessionIdentityStore().get('s1')).toEqual({
      participantId: 'p1',
      token: 'tok',
    });
  });

  it('shows the server error message when joining fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        if (typeof input === 'string' && input.endsWith('/participants')) {
          return Promise.resolve(
            jsonResponse({
              data: null,
              error: { code: 'invalid_name', message: 'Invalid display name' },
            } satisfies ApiResponse<{
              participantId: string;
              token: string;
              displayName: string;
            }>),
          );
        }
        return Promise.resolve(
          jsonResponse({
            data: null,
            error: {
              code: 'unauthorized',
              message: 'Missing or unknown token',
            },
          } satisfies ApiResponse<SessionSnapshot>),
        );
      }),
    );

    renderSessionPage([]);
    await waitFor(() => {
      expect(screen.getByText('Join this session')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Join' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Invalid display name',
      );
    });
  });
});
