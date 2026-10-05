import type { SessionSnapshot } from '@scrum-poker/shared';

export interface ParticipantIdentity {
  participantId: string;
  token: string;
}

export type SessionPageState =
  | { phase: 'loading' }
  | { phase: 'not-found' }
  | { phase: 'join'; submitting: boolean; error: string | null }
  | {
      phase: 'ready';
      identity: ParticipantIdentity;
      snapshot: SessionSnapshot | null;
    };

export type SessionPageAction =
  | { type: 'authenticated'; identity: ParticipantIdentity }
  | { type: 'not_found' }
  | { type: 'unauthenticated' }
  | { type: 'join_submitted' }
  | { type: 'join_failed'; message: string }
  | { type: 'snapshot_received'; snapshot: SessionSnapshot };

export const initialSessionPageState: SessionPageState = { phase: 'loading' };

export function sessionPageReducer(
  state: SessionPageState,
  action: SessionPageAction,
): SessionPageState {
  switch (action.type) {
    case 'authenticated':
      return { phase: 'ready', identity: action.identity, snapshot: null };
    case 'not_found':
      return { phase: 'not-found' };
    case 'unauthenticated':
      return { phase: 'join', submitting: false, error: null };
    case 'join_submitted':
      return state.phase === 'join'
        ? { ...state, submitting: true, error: null }
        : state;
    case 'join_failed':
      return { phase: 'join', submitting: false, error: action.message };
    case 'snapshot_received':
      return state.phase === 'ready'
        ? { ...state, snapshot: action.snapshot }
        : state;
  }
}
