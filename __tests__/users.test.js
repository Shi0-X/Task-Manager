// @ts-check
import _ from 'lodash';
import {
  describe, beforeAll, beforeEach, it, expect, jest, afterAll,
} from '@jest/globals';

import fastify from 'fastify';
import init from '../server/plugin.js';
import encrypt from '../server/lib/secure.cjs';
import { getTestData, prepareData, signIn } from './helpers/index.js';

// Aumentar el tiempo de espera para las pruebas
jest.setTimeout(10000);

describe('test users CRUD', () => {
  let app;
  let knex;
  let models;
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
    
    // Obtener las referencias a knex y los modelos
    knex = app.objection.knex;
    models = app.objection.models;
  });

  beforeEach(async () => {
    // Limpiar datos antes de cada prueba
    try {
      await knex('users').delete();
    } catch (error) {
      console.log('Error al limpiar la tabla de usuarios:', error.message);
    }
    
    // Preparar datos para cada prueba
    await prepareData(app);
  });

  it('index', async () => {
    const response = await app.inject({
      method: 'GET',
      url: app.reverse('users'),
    });
    expect(response.statusCode).toBe(200);
  });

  it('new', async () => {
    const response = await app.inject({
      method: 'GET',
      url: app.reverse('newUser'),
    });
    expect(response.statusCode).toBe(200);
  });

  it('create', async () => {
    const params = testData.users.new;
    const response = await app.inject({
      method: 'POST',
      url: app.reverse('users'),
      payload: {
        data: params,
      },
    });
    expect(response.statusCode).toBe(302);
    const expected = {
      ..._.omit(params, 'password'),
      passwordDigest: encrypt(params.password),
    };
    const user = await models.user.query().findOne({ email: params.email });
    expect(user).toMatchObject(expected);
  });

  it('edit', async () => {
    const cookies = await signIn(app, testData.users.existing);
    const currentUser = await models.user.query()
      .findOne({ email: testData.users.existing.email });
    const response = await app.inject({
      method: 'GET',
      url: app.reverse('editUser', { id: currentUser.id }),
      cookies,
    });
    expect(response.statusCode).toBe(200);
  });

  it('update', async () => {
    const cookies = await signIn(app, testData.users.existing);
    const currentUser = await models.user.query()
      .findOne({ email: testData.users.existing.email });
    const params = testData.users.new;
    const response = await app.inject({
      method: 'PATCH',
      url: app.reverse('updateUser', { id: currentUser.id }),
      cookies,
      payload: {
        data: params,
      },
    });
    expect(response.statusCode).toBe(302);
    const expected = {
      ..._.omit(params, 'password'),
      passwordDigest: encrypt(params.password),
    };
    const user = await models.user.query().findById(currentUser.id);
    expect(user).toMatchObject(expected);
  });

  it('delete', async () => {
    const cookie = await signIn(app, testData.users.deleted);
    const currentUser = await models.user.query()
      .findOne({ email: testData.users.deleted.email });
    const response = await app.inject({
      method: 'DELETE',
      url: app.reverse('deleteUser', { id: currentUser.id }),
      cookies: cookie,
    });
    expect(response.statusCode).toBe(302);
    const user = await models.user.query().findById(currentUser.id);
    expect(user).toBeUndefined();
  });

  afterAll(async () => {
    // Cerrar la aplicación
    await app.close();
  });
});