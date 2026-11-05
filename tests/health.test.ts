import request from 'supertest';
import { describe, it, expect } from 'vitest';

import { app } from '../src/server.js';

describe('GET /health', () => {
  it('retorna status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('rota inexistente retorna 404', async () => {
    const res = await request(app).get('/nao-existe');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('NOT_FOUND');
  });
});