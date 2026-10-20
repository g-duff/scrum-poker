import { useEffect, useReducer } from 'react';
import { useParams } from 'react-router';
import type { ApiResponse } from '@scrum-poker/shared';
import {
  initialSessionPageState,
  sessionPageReducer,
} from '#src/core/sessionPageState';
import type { SessionConnection } from '#src/shell/sessionConnection';
import { createLocalStorageSessionIdentityStore } from '#src/shell/sessionIdentity';
import {
  castVote,
  checkAuthorization,
  clearVote,
  isStaleRoundDetails,
  joinParticipant,
} from '#src/shell/sessionApi';
import { createSseSessionConnection } from '#src/shell/sseSessionConnection';
import { JoinForm } from '#src/pages/sessionPage/JoinForm';
import { NotFound } from '#src/pages/sessionPage/NotFound';
import { ParticipantList } from '#src/pages/sessionPage/ParticipantList';
import { CardPicker } from '#src/pages/sessionPage/CardPicker';
import shared from '#src/styles/shared.module.css';
import { cx } from '#src/styles/cx';
import styles from '#src/pages/SessionPage.module.css';

const identityStore = createLocalStorageSessionIdentityStore();

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
        const body = await joinParticipant(sessionId, displayName);
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

  function handleVoteResponse(result: ApiResponse<null>): void {
    if (result.error === null) return;
    if (
      result.error.code === 'stale_round' &&
      isStaleRoundDetails(result.error.details)
    ) {
      dispatch({
        type: 'snapshot_received',
        snapshot: result.error.details.snapshot,
      });
      return;
    }
    dispatch({ type: 'vote_failed', message: result.error.message });
  }

  function pickCard(card: string): void {
    if (state.phase !== 'ready' || state.snapshot === null) return;
    const { token } = state.identity;
    const { round } = state.snapshot;

    void (async () => {
      try {
        const result = await castVote(sessionId, token, round, card);
        handleVoteResponse(result);
      } catch {
        dispatch({
          type: 'vote_failed',
          message: 'Could not reach the server. Try again.',
        });
      }
    })();
  }

  function clearMyVote(): void {
    if (state.phase !== 'ready' || state.snapshot === null) return;
    const { token } = state.identity;
    const { round } = state.snapshot;

    void (async () => {
      try {
        const result = await clearVote(sessionId, token, round);
        handleVoteResponse(result);
      } catch {
        dispatch({
          type: 'vote_failed',
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
          {state.snapshot.state === 'voting' && (
            <CardPicker
              deck={state.snapshot.deck}
              yourVote={state.snapshot.yourVote}
              error={state.voteError}
              onPick={pickCard}
              onClear={clearMyVote}
            />
          )}
        </main>
      );
  }
}
