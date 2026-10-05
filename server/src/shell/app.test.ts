import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import type { ApiResponse } from '@scrum-poker/shared';
import { createApp } from '#src/shell/app';
import { createInMemorySessionStore } from '#src/shell/inMemorySessionStore';

function body<T>(res: request.Response): ApiResponse<T> {
  return res.body as ApiResponse<T>;
}

function expectSuccess(res: request.Response): unknown {
  const result = body<unknown>(res);
  if (result.error !== null) {
    throw new Error(`Expected success, got error: ${result.error.code}`);
  }
  return result.data;
}

function expectErrorCode(res: request.Response): string {
  const result = body<unknown>(res);
  if (result.error === null) {
    throw new Error('Expected an error response');
  }
  return result.error.code;
}

const SESSION_IDLE_SECONDS = 3600;

function createTestDist() {
  const dir = mkdtempSync(path.join(tmpdir(), 'web-dist-'));
  writeFileSync(
    path.join(dir, 'index.html'),
    '<!doctype html><title>test</title>',
  );
  writeFileSync(path.join(dir, 'style.css'), 'body { color: red; }');
  return dir;
}

function createTestApp() {
  const store = createInMemorySessionStore();
  const app = createApp(createTestDist(), store, SESSION_IDLE_SECONDS);
  return { app, store };
}

describe('GET /api/health', () => {
  it('responds with the envelope and status ok', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { status: 'ok' }, error: null });
  });
});

describe('an unknown /api route', () => {
  it('responds 404 not_found in the envelope', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/api/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      data: null,
      error: { code: 'not_found', message: 'Not found' },
    });
  });
});

describe('a built static asset', () => {
  it('is served from the web dist directory', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/style.css');

    expect(res.status).toBe(200);
    expect(res.text).toContain('color: red');
  });
});

describe('a client route such as /s/:id', () => {
  it('falls back to index.html', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/s/anything');

    expect(res.status).toBe(200);
    expect(res.text).toContain('<title>test</title>');
  });
});

describe('POST /api/sessions', () => {
  it('creates a session with the default deck when none is given', async () => {
    const { app, store } = createTestApp();

    const res = await request(app).post('/api/sessions').send({});

    expect(res.status).toBe(201);
    const { id } = expectSuccess(res) as { id: string };
    await expect(store.get(id)).resolves.toMatchObject({
      id,
      state: 'voting',
      roundNumber: 1,
      participants: [],
      votes: [],
    });
  });

  it('creates a session with a custom deck', async () => {
    const { app, store } = createTestApp();

    const res = await request(app)
      .post('/api/sessions')
      .send({ deck: ['S', 'M', 'L'] });

    expect(res.status).toBe(201);
    const { id } = expectSuccess(res) as { id: string };
    await expect(store.get(id)).resolves.toMatchObject({
      deck: ['S', 'M', 'L'],
    });
  });

  it('rejects an empty deck with invalid_deck', async () => {
    const { app } = createTestApp();

    const res = await request(app)
      .post('/api/sessions')
      .send({ deck: [] });

    expect(res.status).toBe(400);
    expect(expectErrorCode(res)).toBe('invalid_deck');
  });

  it('rejects malformed JSON with invalid_body', async () => {
    const { app } = createTestApp();

    const res = await request(app)
      .post('/api/sessions')
      .set('Content-Type', 'application/json')
      .send('{not json');

    expect(res.status).toBe(400);
    expect(expectErrorCode(res)).toBe('invalid_body');
  });

  it('rejects a body over 16KB with payload_too_large', async () => {
    const { app } = createTestApp();

    const res = await request(app)
      .post('/api/sessions')
      .send({ deck: [], padding: 'x'.repeat(17_000) });

    expect(res.status).toBe(413);
    expect(expectErrorCode(res)).toBe('payload_too_large');
  });
});

describe('POST /api/sessions/:id/participants', () => {
  async function createSession(app: ReturnType<typeof createApp>) {
    const res = await request(app).post('/api/sessions').send({});
    const { id } = expectSuccess(res) as { id: string };
    return id;
  }

  it('joins with the given display name', async () => {
    const { app } = createTestApp();
    const sessionId = await createSession(app);

    const res = await request(app)
      .post(`/api/sessions/${sessionId}/participants`)
      .send({ displayName: 'Ana' });

    expect(res.status).toBe(201);
    expect(expectSuccess(res)).toMatchObject({ displayName: 'Ana' });
  });

  it('returns a distinct participantId and token per join', async () => {
    const { app } = createTestApp();
    const sessionId = await createSession(app);

    const first = expectSuccess(
      await request(app)
        .post(`/api/sessions/${sessionId}/participants`)
        .send({ displayName: 'Ana' }),
    ) as { participantId: string; token: string };
    const second = expectSuccess(
      await request(app)
        .post(`/api/sessions/${sessionId}/participants`)
        .send({ displayName: 'Raj' }),
    ) as { participantId: string; token: string };

    expect(first.participantId).not.toBe(second.participantId);
    expect(first.token).not.toBe(second.token);
  });

  it('suffixes a duplicate name', async () => {
    const { app } = createTestApp();
    const sessionId = await createSession(app);
    await request(app)
      .post(`/api/sessions/${sessionId}/participants`)
      .send({ displayName: 'Ana' });

    const res = await request(app)
      .post(`/api/sessions/${sessionId}/participants`)
      .send({ displayName: 'ana' });

    expect(expectSuccess(res)).toMatchObject({ displayName: 'ana (2)' });
  });

  it('rejects an empty display name with invalid_name', async () => {
    const { app } = createTestApp();
    const sessionId = await createSession(app);

    const res = await request(app)
      .post(`/api/sessions/${sessionId}/participants`)
      .send({ displayName: '   ' });

    expect(res.status).toBe(400);
    expect(expectErrorCode(res)).toBe('invalid_name');
  });

  it('returns not_found for an unknown session', async () => {
    const { app } = createTestApp();

    const res = await request(app)
      .post('/api/sessions/123e4567-e89b-12d3-a456-426614174000/participants')
      .send({ displayName: 'Ana' });

    expect(res.status).toBe(404);
    expect(expectErrorCode(res)).toBe('not_found');
  });

  it('returns not_found for a malformed session id', async () => {
    const { app } = createTestApp();

    const res = await request(app)
      .post('/api/sessions/not-a-uuid/participants')
      .send({ displayName: 'Ana' });

    expect(res.status).toBe(404);
    expect(expectErrorCode(res)).toBe('not_found');
  });
});

describe('GET /api/sessions/:id', () => {
  async function createSessionAndJoin(
    app: ReturnType<typeof createApp>,
    displayName = 'Ana',
  ) {
    const createRes = await request(app).post('/api/sessions').send({});
    const { id: sessionId } = expectSuccess(createRes) as { id: string };

    const joinRes = await request(app)
      .post(`/api/sessions/${sessionId}/participants`)
      .send({ displayName });
    const { participantId, token } = expectSuccess(joinRes) as {
      participantId: string;
      token: string;
    };

    return { sessionId, participantId, token };
  }

  it('returns the snapshot for a valid token', async () => {
    const { app } = createTestApp();
    const { sessionId, participantId, token } =
      await createSessionAndJoin(app);

    const res = await request(app)
      .get(`/api/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(expectSuccess(res)).toMatchObject({
      id: sessionId,
      round: 1,
      state: 'voting',
      participants: [
        { id: participantId, name: 'Ana', active: true, hasVoted: false },
      ],
    });
  });

  it('returns unauthorized with a missing token', async () => {
    const { app } = createTestApp();
    const { sessionId } = await createSessionAndJoin(app);

    const res = await request(app).get(`/api/sessions/${sessionId}`);

    expect(res.status).toBe(401);
    expect(expectErrorCode(res)).toBe('unauthorized');
  });

  it('returns unauthorized with an unknown token', async () => {
    const { app } = createTestApp();
    const { sessionId } = await createSessionAndJoin(app);

    const res = await request(app)
      .get(`/api/sessions/${sessionId}`)
      .set('Authorization', 'Bearer wrong-token');

    expect(res.status).toBe(401);
    expect(expectErrorCode(res)).toBe('unauthorized');
  });

  it('returns not_found for an unknown session', async () => {
    const { app } = createTestApp();

    const res = await request(app)
      .get('/api/sessions/123e4567-e89b-12d3-a456-426614174000')
      .set('Authorization', 'Bearer anything');

    expect(res.status).toBe(404);
    expect(expectErrorCode(res)).toBe('not_found');
  });
});
