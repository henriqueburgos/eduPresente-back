import request from 'supertest';
import { describe, it, expect } from 'vitest';

import { app } from '../src/server.js';

describe('auth guard', () => {
  it('POST /atividades sem token retorna 401', async () => {
    const res = await request(app).post('/atividades').send({ pacienteId: 'p1', tipo: 'alimentacao', descricao: 'x' });
    expect(res.status).toBe(401);
  });

  it('GET /auditoria sem token retorna 401', async () => {
    const res = await request(app).get('/auditoria');
    expect(res.status).toBe(401);
  });
});