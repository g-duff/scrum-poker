import type { SessionSnapshot } from '@scrum-poker/shared';
import shared from '#src/styles/shared.module.css';
import { cx } from '#src/styles/cx';

export function ParticipantList({
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
