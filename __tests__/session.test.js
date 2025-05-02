// @ts-check
import {
  describe, beforeAll, it, expect, jest, afterAll,
} from '@jest/globals';

import fastify from 'fastify';
import init from '../server/plugin.js';
import { getTestData, prepareData } from './helpers/index.js';

// Aumentar el tiempo de espera para las pruebas
jest.setTimeout(10000);

describe('test session', () => {
  let app;
  let knex;
  const testData = getTestData();

  beforeAll(async () => {
    // Configurar para usar la base de datos en memoria
    process.env.SQLITE_MEMORY = 'true';
    
    // Inicializar la aplicación
    app = fastify({
      exposeHeadRoutes: false,
      logger: { target: 'pino-pretty' },
    });
    
    // Inicializar con todos los plugins
    await init(app);
    
    // Obtener la referencia a knex
    knex = app.objection.knex;
    
    // Limpiar datos antes de las pruebas
    try {
      await knex('users').delete();
    } catch (error) {
      console.log('Error al limpiar la tabla de usuarios:', error.message);
    }
    
    // Preparar datos para las pruebas
    await prepareData(app);
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
    // Cerrar la aplicación
    await app.close();
  });
});