import { describe, expect, it } from 'vitest';
import type { Session } from '@scrum-poker/shared';
import { buildSessionSnapshot } from '#src/core/snapshot';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 's1',
    deck: ['1', '2'],
    state: 'voting',
    roundNumber: 3,
    expiresAt: new Date(Date.now() + 60_000),
    participants: [
      {
        id: 'p1',
        sessionId: 's1',
        displayName: 'Ana',
        tokenHash: 'hash1',
        lastSeenAt: new Date(),
      },
      {
        id: 'p2',
        sessionId: 's1',
        displayName: 'Raj',
        tokenHash: 'hash2',
        lastSeenAt: new Date(),
      },
    ],
    votes: [],
    ...overrides,
  };
}

describe('buildSessionSnapshot', () => {
  it('maps session fields and participant order', () => {
    const snapshot = buildSessionSnapshot(makeSession(), 'p1');

    expect(snapshot.id).toBe('s1');
    expect(snapshot.round).toBe(3);
    expect(snapshot.state).toBe('voting');
    expect(snapshot.deck).toEqual(['1', '2']);
    expect(snapshot.participants.map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  it('reports hasVoted but hides the value while voting', () => {
    const session = makeSession({
      votes: [{ sessionId: 's1', participantId: 'p1', value: '5' }],
    });

    const snapshot = buildSessionSnapshot(session, 'p2');

    const ana = snapshot.participants.find((p) => p.id === 'p1');
    expect(ana).toMatchObject({ hasVoted: true });
    expect(ana?.vote).toBeUndefined();
  });

  it('reveals values once the session is revealed', () => {
    const session = makeSession({
      state: 'revealed',
      votes: [{ sessionId: 's1', participantId: 'p1', value: '5' }],
    });

    const snapshot = buildSessionSnapshot(session, 'p2');

    const ana = snapshot.participants.find((p) => p.id === 'p1');
    expect(ana).toMatchObject({ hasVoted: true, vote: '5' });
  });

  it('shows the viewer their own vote even while voting', () => {
    const session = makeSession({
      votes: [{ sessionId: 's1', participantId: 'p1', value: '5' }],
    });

    const snapshot = buildSessionSnapshot(session, 'p1');

    expect(snapshot.yourVote).toBe('5');
  });

  it('omits yourVote when the viewer has not voted', () => {
    const snapshot = buildSessionSnapshot(makeSession(), 'p1');

    expect(snapshot.yourVote).toBeUndefined();
  });
});
