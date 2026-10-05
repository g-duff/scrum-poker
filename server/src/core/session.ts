import type { Session } from '@scrum-poker/shared';

export function createNewSession(
  id: string,
  deck: string[],
  expiresAt: Date,
): Session {
  return {
    id,
    deck,
    state: 'voting',
    roundNumber: 1,
    expiresAt,
    participants: [],
    votes: [],
  };
}

export function isSessionExpired(session: Session, now: Date): boolean {
  return session.expiresAt <= now;
}
