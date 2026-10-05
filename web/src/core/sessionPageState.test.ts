import { describe, expect, it } from 'vitest';
import type { SessionSnapshot } from '@scrum-poker/shared';
import {
  initialSessionPageState,
  sessionPageReducer,
  type SessionPageState,
} from '#src/core/sessionPageState';

const identity = { participantId: 'p1', token: 'tok' };

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

describe('sessionPageReducer', () => {
  it('starts in the loading phase', () => {
    expect(initialSessionPageState).toEqual({ phase: 'loading' });
  });

  it('moves to ready with no snapshot yet when authenticated', () => {
    const state = sessionPageReducer(initialSessionPageState, {
      type: 'authenticated',
      identity,
    });

    expect(state).toEqual({ phase: 'ready', identity, snapshot: null });
  });

  it('moves to not-found', () => {
    const state = sessionPageReducer(initialSessionPageState, {
      type: 'not_found',
    });

    expect(state).toEqual({ phase: 'not-found' });
  });

  it('moves to join with no error when unauthenticated', () => {
    const state = sessionPageReducer(initialSessionPageState, {
      type: 'unauthenticated',
    });

    expect(state).toEqual({ phase: 'join', submitting: false, error: null });
  });

  it('marks the join form as submitting', () => {
    const joinState: SessionPageState = {
      phase: 'join',
      submitting: false,
      error: null,
    };

    const state = sessionPageReducer(joinState, { type: 'join_submitted' });

    expect(state).toEqual({ phase: 'join', submitting: true, error: null });
  });

  it('ignores join_submitted outside the join phase', () => {
    const state = sessionPageReducer(initialSessionPageState, {
      type: 'join_submitted',
    });

    expect(state).toEqual(initialSessionPageState);
  });

  it('shows the join error and stops submitting on join_failed', () => {
    const joinState: SessionPageState = {
      phase: 'join',
      submitting: true,
      error: null,
    };

    const state = sessionPageReducer(joinState, {
      type: 'join_failed',
      message: 'Invalid display name',
    });

    expect(state).toEqual({
      phase: 'join',
      submitting: false,
      error: 'Invalid display name',
    });
  });

  it('stores an incoming snapshot while ready', () => {
    const readyState: SessionPageState = {
      phase: 'ready',
      identity,
      snapshot: null,
    };
    const snapshot = makeSnapshot();

    const state = sessionPageReducer(readyState, {
      type: 'snapshot_received',
      snapshot,
    });

    expect(state).toEqual({ phase: 'ready', identity, snapshot });
  });

  it('ignores an incoming snapshot outside the ready phase', () => {
    const state = sessionPageReducer(initialSessionPageState, {
      type: 'snapshot_received',
      snapshot: makeSnapshot(),
    });

    expect(state).toEqual(initialSessionPageState);
  });
});
