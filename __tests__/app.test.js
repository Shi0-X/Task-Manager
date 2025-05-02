// @ts-check

import {
  describe, beforeAll, it, expect, jest, afterAll,
} from '@jest/globals';

import fastify from 'fastify';
import init from '../server/plugin.js';

// Aumentar el tiempo de espera para las pruebas
jest.setTimeout(10000);

describe('requests', () => {
  let app;

  beforeAll(async () => {
    app = fastify({
      exposeHeadRoutes: false,
      logger: { target: 'pino-pretty' },
    });
    await init(app);
  });

  it('GET 200', async () => {
    const res = await app.inject({
      method: 'GET',
      url: app.reverse('root'),
    });
    expect(res.statusCode).toBe(200);
  });

  it('GET 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/wrong-path',
    });
    expect(res.statusCode).toBe(404);
  });

  afterAll(async () => {
    await app.close();
  });
});