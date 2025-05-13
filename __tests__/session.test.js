// @ts-check
import {
  describe, beforeAll, it, expect, afterAll,
} from '@jest/globals';

import fastify from 'fastify';
import init from '../server/plugin.js';
import { getTestData, prepareData } from './helpers/index.js';

describe('test session', () => {
  let app;
  let knex;
  const testData = getTestData();

  beforeAll(async () => {
    // Configuración simple, igual que app.test.js
    app = fastify({
      exposeHeadRoutes: false,
      logger: { target: 'pino-pretty' },
    });

    await init(app);

    knex = app.objection.knex;

    // IMPORTANTE: No ejecutamos migraciones aquí
    // En su lugar, confiamos en que el entorno de prueba ya tenga las tablas necesarias

    // Intenta crear la tabla users manualmente si no existe
    try {
      const hasTable = await knex.schema.hasTable('users');
      if (!hasTable) {
        await knex.schema.createTable('users', (table) => {
          table.increments('id').primary();
          table.string('first_name');
          table.string('last_name');
          table.string('email');
          table.string('password_digest');
          table.timestamps(true, true);
        });
      }

      // Preparar datos de prueba después de asegurarnos de que la tabla existe
      await prepareData(app);
    } catch (err) {
      console.error('Error al configurar la base de datos:', err);
    }
  });

  it('test sign in / sign out', async () => {
    const response = await app.inject({
      method: 'GET',
      url: app.reverse('newSession'),
    });
    expect(response.statusCode).toBe(200);

    const responseSignIn = await app.inject({
      method: 'POST',
      url: app.reverse('session'),
      payload: {
        data: testData.users.existing,
      },
    });
    expect(responseSignIn.statusCode).toBe(302);

    const [sessionCookie] = responseSignIn.cookies;
    const { name, value } = sessionCookie;
    const cookie = { [name]: value };

    const responseSignOut = await app.inject({
      method: 'DELETE',
      url: app.reverse('session'),
      cookies: cookie,
    });
    expect(responseSignOut.statusCode).toBe(302);
  });

  afterAll(async () => {
    await app.close();
  });
});
