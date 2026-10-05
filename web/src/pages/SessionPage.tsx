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
import shared from '#src/styles/shared.module.css';
import { cx } from '#src/styles/cx';
import styles from '#src/pages/SessionPage.module.css';

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
    <main className={cx(shared.wrap)}>
      <h1 className={cx(styles.title)}>Scrum Poker</h1>
      <div className={cx(shared.panel)}>
        <h2 className={cx(styles.subtitle)}>Join this session</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="displayName" className={cx(shared.label)}>
            Your name
          </label>
          <div className={cx(shared.row)}>
            <input
              id="displayName"
              className={cx(shared.textInput)}
              value={displayName}
              onChange={(event) => {
                setDisplayName(event.target.value);
              }}
            />
            <button
              type="submit"
              className={cx(shared.buttonPrimary)}
              disabled={submitting}
            >
              Join
            </button>
          </div>
          {error !== null && (
            <p role="alert" className={cx(shared.note, shared.noteErr)}>
              {error}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}

function NotFound() {
  return (
    <main className={cx(shared.wrap)}>
      <h1 className={cx(styles.title)}>Scrum Poker</h1>
      <div className={cx(shared.panel)}>
        <p className={cx(styles.notFoundLead)}>Session not found</p>
        <p className={cx(shared.muted)}>
          It may have expired or the link may be wrong.
        </p>
        <Link
          to="/"
          className={cx(shared.buttonPrimary, styles.createLink)}
        >
          Create a new session
        </Link>
      </div>
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
    <section className={cx(shared.panel)}>
      <h2 className={cx(shared.sectionLabel)}>Participants</h2>
      <div className={cx(shared.list)}>
        {participants.map((participant) => (
          <div key={participant.id} className={cx(shared.rowCard)}>
            <span>
              {participant.name}
              {participant.id === yourParticipantId ? ' (you)' : ''}
            </span>
            <span className={cx(shared.muted)}>
              {participant.hasVoted ? 'voted' : 'not voted'}
              {participant.active ? '' : '  (inactive)'}
            </span>
          </div>
        ))}
      </div>
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
        <main className={cx(shared.wrap)}>
          <h1 className={cx(styles.title)}>Scrum Poker</h1>
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
          <main className={cx(shared.wrap)}>
            <p className={cx(shared.muted)}>Loading session...</p>
          </main>
        );
      }
      return (
        <main className={cx(shared.wrap)}>
          <h1 className={cx(styles.title)}>
            {state.snapshot.state === 'revealed' ? 'Revealed' : 'Voting'}
          </h1>
          <ParticipantList
            participants={state.snapshot.participants}
            yourParticipantId={state.identity.participantId}
          />
        </main>
      );
  }
}
