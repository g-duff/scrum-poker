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
