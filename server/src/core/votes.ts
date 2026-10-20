import type { Session } from '@scrum-poker/shared';

export type VoteActionResult =
  | { outcome: 'ok'; session: Session }
  | { outcome: 'stale_round' }
  | { outcome: 'invalid_card' };

export function castVote(
  session: Session,
  participantId: string,
  round: number,
  value: string,
): VoteActionResult {
  if (round !== session.roundNumber) {
    return { outcome: 'stale_round' };
  }
  if (!session.deck.includes(value)) {
    return { outcome: 'invalid_card' };
  }

  const votes = [
    ...session.votes.filter((vote) => vote.participantId !== participantId),
    { sessionId: session.id, participantId, value },
  ];

  return { outcome: 'ok', session: { ...session, votes } };
}

export function clearVote(
  session: Session,
  participantId: string,
  round: number,
): VoteActionResult {
  if (round !== session.roundNumber) {
    return { outcome: 'stale_round' };
  }

  const votes = session.votes.filter(
    (vote) => vote.participantId !== participantId,
  );

  return { outcome: 'ok', session: { ...session, votes } };
}
