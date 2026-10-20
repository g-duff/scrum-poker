import type { ApiResponse, SessionSnapshot } from '@scrum-poker/shared';

export async function checkAuthorization(
  sessionId: string,
  token: string | null,
): Promise<'ok' | 'unauthorized' | 'not_found'> {
  const response = await fetch(`/api/sessions/${sessionId}`, {
    headers: token !== null ? { Authorization: `Bearer ${token}` } : {},
  });
  const body = (await response.json()) as ApiResponse<SessionSnapshot>;
  if (body.error === null) return 'ok';
  return body.error.code === 'unauthorized' ? 'unauthorized' : 'not_found';
}

export async function joinParticipant(
  sessionId: string,
  displayName: string,
): Promise<ApiResponse<{ participantId: string; token: string; displayName: string }>> {
  const response = await fetch(`/api/sessions/${sessionId}/participants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  });
  return (await response.json()) as ApiResponse<{
    participantId: string;
    token: string;
    displayName: string;
  }>;
}

export async function castVote(
  sessionId: string,
  token: string,
  round: number,
  value: string,
): Promise<ApiResponse<null>> {
  const response = await fetch(`/api/sessions/${sessionId}/votes/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ round, value }),
  });
  return (await response.json()) as ApiResponse<null>;
}

export async function clearVote(
  sessionId: string,
  token: string,
  round: number,
): Promise<ApiResponse<null>> {
  const response = await fetch(
    `/api/sessions/${sessionId}/votes/me?round=${String(round)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  return (await response.json()) as ApiResponse<null>;
}

export function isStaleRoundDetails(
  details: unknown,
): details is { snapshot: SessionSnapshot } {
  return typeof details === 'object' && details !== null && 'snapshot' in details;
}
