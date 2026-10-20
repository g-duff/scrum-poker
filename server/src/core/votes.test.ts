import { describe, expect, it } from 'vitest';
import type { Session } from '@scrum-poker/shared';
import { castVote, clearVote } from '#src/core/votes';

const expiresAt = new Date('2024-01-01T01:00:00Z');

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 's1',
    deck: ['1', '2', '3'],
    state: 'voting',
    roundNumber: 1,
    expiresAt,
    participants: [],
    votes: [],
    ...overrides,
  };
}

describe('castVote', () => {
  it('adds a vote for a participant with no existing vote', () => {
    const result = castVote(makeSession(), 'p1', 1, '2');

    expect(result).toEqual({
      outcome: 'ok',
      session: makeSession({
        votes: [{ sessionId: 's1', participantId: 'p1', value: '2' }],
      }),
    });
  });

  it('replaces an existing vote for the same participant', () => {
    const session = makeSession({
      votes: [{ sessionId: 's1', participantId: 'p1', value: '1' }],
    });

    const result = castVote(session, 'p1', 1, '3');

    expect(result).toEqual({
      outcome: 'ok',
      session: makeSession({
        votes: [{ sessionId: 's1', participantId: 'p1', value: '3' }],
      }),
    });
  });

  it('leaves other participants votes untouched', () => {
    const session = makeSession({
      votes: [{ sessionId: 's1', participantId: 'p2', value: '1' }],
    });

    const result = castVote(session, 'p1', 1, '2');

    expect(result.outcome).toBe('ok');
    expect(result.outcome === 'ok' && result.session.votes).toEqual([
      { sessionId: 's1', participantId: 'p2', value: '1' },
      { sessionId: 's1', participantId: 'p1', value: '2' },
    ]);
  });

  it('rejects a value that is not a card in the deck', () => {
    const result = castVote(makeSession(), 'p1', 1, '99');

    expect(result).toEqual({ outcome: 'invalid_card' });
  });

  it('rejects a stale round', () => {
    const result = castVote(makeSession({ roundNumber: 2 }), 'p1', 1, '2');

    expect(result).toEqual({ outcome: 'stale_round' });
  });
});

describe('clearVote', () => {
  it('removes the participants vote', () => {
    const session = makeSession({
      votes: [{ sessionId: 's1', participantId: 'p1', value: '1' }],
    });

    const result = clearVote(session, 'p1', 1);

    expect(result).toEqual({ outcome: 'ok', session: makeSession() });
  });

  it('leaves other participants votes untouched', () => {
    const session = makeSession({
      votes: [
        { sessionId: 's1', participantId: 'p1', value: '1' },
        { sessionId: 's1', participantId: 'p2', value: '2' },
      ],
    });

    const result = clearVote(session, 'p1', 1);

    expect(result).toEqual({
      outcome: 'ok',
      session: makeSession({
        votes: [{ sessionId: 's1', participantId: 'p2', value: '2' }],
      }),
    });
  });

  it('is a no-op when the participant has no vote', () => {
    const result = clearVote(makeSession(), 'p1', 1);

    expect(result).toEqual({ outcome: 'ok', session: makeSession() });
  });

  it('rejects a stale round', () => {
    const result = clearVote(makeSession({ roundNumber: 2 }), 'p1', 1);

    expect(result).toEqual({ outcome: 'stale_round' });
  });
});
