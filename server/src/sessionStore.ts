import type { Session } from '@scrum-poker/shared';

export interface SessionStore {
  create(session: Session): Promise<void>;
  get(id: string): Promise<Session | null>;
  update(id: string, fn: (session: Session) => Session): Promise<Session>;
  deleteExpired(now: Date): Promise<string[]>;
}
