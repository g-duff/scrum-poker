import type { SessionSnapshot } from '@scrum-poker/shared';

export interface SessionConnection {
  connect(sessionId: string, token: string): void;
  onSnapshot(handler: (snapshot: SessionSnapshot) => void): () => void;
  close(): void;
}
