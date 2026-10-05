import { createHash, timingSafeEqual } from 'node:crypto';
import type { Participant, Session } from '@scrum-poker/shared';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function hashesMatch(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'hex');
  const bufferB = Buffer.from(b, 'hex');
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}

export function findParticipantByTokenHash(
  session: Session,
  tokenHash: string,
): Participant | null {
  return (
    session.participants.find((participant) =>
      hashesMatch(participant.tokenHash, tokenHash),
    ) ?? null
  );
}
