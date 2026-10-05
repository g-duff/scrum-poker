import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '#src/shell/app';

function createTestDist() {
  const dir = mkdtempSync(path.join(tmpdir(), 'web-dist-'));
  writeFileSync(
    path.join(dir, 'index.html'),
    '<!doctype html><title>test</title>',
  );
  writeFileSync(path.join(dir, 'style.css'), 'body { color: red; }');
  return dir;
}

describe('GET /api/health', () => {
  it('responds with the envelope and status ok', async () => {
    const app = createApp(createTestDist());
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { status: 'ok' }, error: null });
  });
});

describe('an unknown /api route', () => {
  it('responds 404 not_found in the envelope', async () => {
    const app = createApp(createTestDist());
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
    const app = createApp(createTestDist());
    const res = await request(app).get('/style.css');

    expect(res.status).toBe(200);
    expect(res.text).toContain('color: red');
  });
});

describe('a client route such as /s/:id', () => {
  it('falls back to index.html', async () => {
    const app = createApp(createTestDist());
    const res = await request(app).get('/s/anything');

    expect(res.status).toBe(200);
    expect(res.text).toContain('<title>test</title>');
  });
});
