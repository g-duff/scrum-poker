import { useEffect, useReducer, useState } from 'react';
import type { SubmitEvent } from 'react';
import { Link, useParams } from 'react-router';
import type { ApiResponse, SessionSnapshot } from '@scrum-poker/shared';
import {
  initialSessionPageState,
  sessionPageReducer,
} from '#src/core/sessionPageState';
import type { SessionConnection } from '#src/shell/sessionConnection';
import { createLocalStorageSessionIdentityStore } from '#src/shell/sessionIdentity';
import { createSseSessionConnection } from '#src/shell/sseSessionConnection';

const identityStore = createLocalStorageSessionIdentityStore();

async function checkAuthorization(
  sessionId: string,
  token: string | null,
): Promise<'ok' | 'unauthorized' | 'not_found'> {
  const response = await fetch(`/api/sessions/${sessionId}`, {
    headers: token !== null ? { Authorization: `Bearer ${token}` } : {},
  });
  const body = (await response.json()) as ApiResponse<SessionSnapshot>;
  if (body.error === null) return 'ok';
  return body.error.code === 'unauthorized' ? 'unauthorized' : 'not_found';
}

function JoinForm({
  submitting,
  error,
  onSubmit,
}: {
  submitting: boolean;
  error: string | null;
  onSubmit: (displayName: string) => void;
}) {
  const [displayName, setDisplayName] = useState('');

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit(displayName);
  }

  return (
    <main>
      <h1>Scrum Poker</h1>
      <h2>Join this session</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="displayName">Your name</label>
        <input
          id="displayName"
          value={displayName}
          onChange={(event) => {
            setDisplayName(event.target.value);
          }}
        />
        {error !== null && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          Join
        </button>
      </form>
    </main>
  );
}

function NotFound() {
  return (
    <main>
      <h1>Scrum Poker</h1>
      <p>Session not found</p>
      <p>It may have expired or the link may be wrong.</p>
      <Link to="/">Create a new session</Link>
    </main>
  );
}

function ParticipantList({
  participants,
  yourParticipantId,
}: {
  participants: SessionSnapshot['participants'];
  yourParticipantId: string;
}) {
  return (
    <section>
      <h2>Participants</h2>
      <ul>
        {participants.map((participant) => (
          <li key={participant.id}>
            {participant.name}
            {participant.id === yourParticipantId ? ' (you)' : ''}
            {'  '}
            {participant.hasVoted ? 'voted' : 'not voted'}
            {participant.active ? '' : '  (inactive)'}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SessionPage({
  createConnection = createSseSessionConnection,
}: {
  createConnection?: () => SessionConnection;
} = {}) {
  const { id } = useParams<{ id: string }>();
  const sessionId = id ?? '';
  const [state, dispatch] = useReducer(
    sessionPageReducer,
    initialSessionPageState,
  );

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      const identity = identityStore.get(sessionId);
      const outcome = await checkAuthorization(
        sessionId,
        identity?.token ?? null,
      );
      if (cancelled) return;

      if (outcome === 'ok' && identity) {
        dispatch({
          type: 'authenticated',
          identity: {
            participantId: identity.participantId,
            token: identity.token,
          },
        });
      } else if (outcome === 'not_found') {
        dispatch({ type: 'not_found' });
      } else {
        identityStore.clear(sessionId);
        dispatch({ type: 'unauthenticated' });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const readyToken = state.phase === 'ready' ? state.identity.token : null;

  useEffect(() => {
    if (readyToken === null) return;

    const connection = createConnection();
    const unsubscribe = connection.onSnapshot((snapshot) => {
      dispatch({ type: 'snapshot_received', snapshot });
    });
    connection.connect(sessionId, readyToken);

    return () => {
      unsubscribe();
      connection.close();
    };
  }, [sessionId, readyToken, createConnection]);

  function join(displayName: string): void {
    dispatch({ type: 'join_submitted' });

    void (async () => {
      try {
        const response = await fetch(
          `/api/sessions/${sessionId}/participants`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName }),
          },
        );
        const body = (await response.json()) as ApiResponse<{
          participantId: string;
          token: string;
          displayName: string;
        }>;
        if (body.error !== null) {
          dispatch({ type: 'join_failed', message: body.error.message });
          return;
        }

        identityStore.set(sessionId, {
          participantId: body.data.participantId,
          token: body.data.token,
        });
        dispatch({
          type: 'authenticated',
          identity: {
            participantId: body.data.participantId,
            token: body.data.token,
          },
        });
      } catch {
        dispatch({
          type: 'join_failed',
          message: 'Could not reach the server. Try again.',
        });
      }
    })();
  }

  switch (state.phase) {
    case 'loading':
      return (
        <main>
          <h1>Scrum Poker</h1>
        </main>
      );
    case 'not-found':
      return <NotFound />;
    case 'join':
      return (
        <JoinForm
          submitting={state.submitting}
          error={state.error}
          onSubmit={join}
        />
      );
    case 'ready':
      if (state.snapshot === null) {
        return (
          <main>
            <p>Loading session...</p>
          </main>
        );
      }
      return (
        <main>
          <h1>{state.snapshot.state === 'revealed' ? 'Revealed' : 'Voting'}</h1>
          <ParticipantList
            participants={state.snapshot.participants}
            yourParticipantId={state.identity.participantId}
          />
        </main>
      );
  }
}
