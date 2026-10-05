import type { Session, SessionSnapshot } from '@scrum-poker/shared';

export function buildSessionSnapshot(
  session: Session,
  viewerParticipantId: string,
): SessionSnapshot {
  const participants = session.participants.map((participant) => {
    const vote = session.votes.find(
      (candidate) => candidate.participantId === participant.id,
    );
    return {
      id: participant.id,
      name: participant.displayName,
      // Presence/inactivity (slice 5) doesn't exist yet, so everyone is
      // active for now.
      active: true,
      hasVoted: vote !== undefined,
      vote: session.state === 'revealed' ? vote?.value : undefined,
    };
  });

  return {
    id: session.id,
    round: session.roundNumber,
    state: session.state,
    deck: session.deck,
    participants,
    yourVote: session.votes.find(
      (candidate) => candidate.participantId === viewerParticipantId,
    )?.value,
  };
}
