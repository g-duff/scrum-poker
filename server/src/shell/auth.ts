import { randomBytes } from 'node:crypto';
import type { Session } from '@scrum-poker/shared';
import {
  findParticipantByTokenHash,
  hashToken,
  isValidUuid,
} from '#src/core/auth';
import type { SessionStore } from '#src/shell/sessionStore';

export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export type AuthResult =
  | { outcome: 'ok'; session: Session; participantId: string }
  | { outcome: 'not_found' }
  | { outcome: 'unauthorized' };

function extractBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authorizationHeader.slice('Bearer '.length);
}

export async function authenticateParticipant(
  store: SessionStore,
  sessionId: string,
  authorizationHeader: string | undefined,
): Promise<AuthResult> {
  if (!isValidUuid(sessionId)) {
    return { outcome: 'not_found' };
  }

  const session = await store.get(sessionId);
  if (!session) {
    return { outcome: 'not_found' };
  }

  const token = extractBearerToken(authorizationHeader);
  if (!token) {
    return { outcome: 'unauthorized' };
  }

  const participant = findParticipantByTokenHash(session, hashToken(token));
  if (!participant) {
    return { outcome: 'unauthorized' };
  }

  return { outcome: 'ok', session, participantId: participant.id };
}
