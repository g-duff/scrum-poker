import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiResponse, SessionSnapshot } from '@scrum-poker/shared';
import {
  castVote,
  checkAuthorization,
  clearVote,
  isStaleRoundDetails,
  joinParticipant,
} from '#src/shell/sessionApi';

function jsonResponse(body: unknown) {
  return { json: () => Promise.resolve(body) };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('checkAuthorization', () => {
  it('sends the token as a bearer header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ data: null, error: null } satisfies ApiResponse<null>),
    );
    vi.stubGlobal('fetch', fetchMock);

    await checkAuthorization('s1', 'tok');

    expect(fetchMock).toHaveBeenCalledWith('/api/sessions/s1', {
      headers: { Authorization: 'Bearer tok' },
    });
  });

  it('returns ok on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ data: null, error: null } satisfies ApiResponse<null>),
      ),
    );

    await expect(checkAuthorization('s1', 'tok')).resolves.toBe('ok');
  });

  it('returns unauthorized when the token is rejected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: null,
          error: { code: 'unauthorized', message: 'Missing or unknown token' },
        } satisfies ApiResponse<null>),
      ),
    );

    await expect(checkAuthorization('s1', 'tok')).resolves.toBe('unauthorized');
  });

  it('returns not_found for any other error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: null,
          error: { code: 'not_found', message: 'Session not found' },
        } satisfies ApiResponse<null>),
      ),
    );

    await expect(checkAuthorization('s1', null)).resolves.toBe('not_found');
  });
});

describe('joinParticipant', () => {
  it('posts the display name', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: { participantId: 'p1', token: 'tok', displayName: 'Ana' },
        error: null,
      } satisfies ApiResponse<{
        participantId: string;
        token: string;
        displayName: string;
      }>),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await joinParticipant('s1', 'Ana');

    expect(fetchMock).toHaveBeenCalledWith('/api/sessions/s1/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Ana' }),
    });
    expect(result.data).toEqual({
      participantId: 'p1',
      token: 'tok',
      displayName: 'Ana',
    });
  });
});

describe('castVote', () => {
  it('puts the round and value with a bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ data: null, error: null } satisfies ApiResponse<null>),
    );
    vi.stubGlobal('fetch', fetchMock);

    await castVote('s1', 'tok', 1, '5');

    expect(fetchMock).toHaveBeenCalledWith('/api/sessions/s1/votes/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer tok',
      },
      body: JSON.stringify({ round: 1, value: '5' }),
    });
  });
});

describe('clearVote', () => {
  it('deletes with the round in the query string', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ data: null, error: null } satisfies ApiResponse<null>),
    );
    vi.stubGlobal('fetch', fetchMock);

    await clearVote('s1', 'tok', 1);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/sessions/s1/votes/me?round=1',
      { method: 'DELETE', headers: { Authorization: 'Bearer tok' } },
    );
  });
});

describe('isStaleRoundDetails', () => {
  it('is true for an object carrying a snapshot', () => {
    const snapshot: SessionSnapshot = {
      id: 's1',
      round: 1,
      state: 'voting',
      deck: ['1'],
      participants: [],
    };

    expect(isStaleRoundDetails({ snapshot })).toBe(true);
  });

  it('is false for anything else', () => {
    expect(isStaleRoundDetails(undefined)).toBe(false);
    expect(isStaleRoundDetails(null)).toBe(false);
    expect(isStaleRoundDetails({})).toBe(false);
  });
});
