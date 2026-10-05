import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '#src/app';

describe('GET /api/health', () => {
  it('responds with the envelope and status ok', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { status: 'ok' }, error: null });
  });
});

describe('an unknown /api route', () => {
  it('responds 404 not_found in the envelope', async () => {
    const res = await request(app).get('/api/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      data: null,
      error: { code: 'not_found', message: 'Not found' },
    });
  });
});
