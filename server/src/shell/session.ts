import type { Session } from '@scrum-poker/shared';
import { isValidUuid } from '#src/core/auth';
import { isSessionExpired } from '#src/core/session';
import type { SessionStore } from '#src/shell/sessionStore';

export async function findActiveSession(
  store: SessionStore,
  sessionId: string,
): Promise<Session | null> {
  if (!isValidUuid(sessionId)) {
    return null;
  }

  const session = await store.get(sessionId);
  if (!session || isSessionExpired(session, new Date())) {
    return null;
  }

  return session;
}
