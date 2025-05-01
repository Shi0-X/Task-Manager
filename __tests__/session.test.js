// @ts-check

import fastify from 'fastify';
import init from '../server/plugin.js';
import { getTestData, prepareData, closeTestConnection, addTestUser } from './helpers/index.js';

describe('test session', () => {
  let app;
  let knex;
  let testData;

  beforeAll(async () => {
    app = fastify({
      exposeHeadRoutes: false,
      logger: { target: 'pino-pretty' },
    });
    
    await init(app);
    knex = app.objection.knex;
    
    try {
      // Usar la función prepareData modificada que ejecuta migraciones directamente
      await prepareData(app);
      testData = getTestData();
      
      // Asegurar que existe un usuario de prueba para iniciar sesión
      await addTestUser(testData.users.existing);
    } catch (error) {
      console.error('Error en la configuración de las pruebas:', error);
      throw error;
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
    
    // Obtener las cookies para solicitudes posteriores
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
    
    // Cerrar la conexión de prueba
    await closeTestConnection();
  });
});