// __tests__/tasks.test.js
// @ts-check

import {
  describe, beforeAll, it, expect, afterAll,
} from '@jest/globals';

import fastify from 'fastify';
import init from '../server/plugin.js';
import { getTestData, prepareData, signIn } from './helpers/index.js';
import { prepareTaskData, createTestTask } from './helpers/tasks.js';

describe('test tasks CRUD', () => {
  let app;
  let knex;
  let models;
  const testData = getTestData();

  beforeAll(async () => {
    // Configuración simple, igual que users.test.js
    app = fastify({
      exposeHeadRoutes: false,
      logger: { target: 'pino-pretty' },
    });
    
    await init(app);
    
    knex = app.objection.knex;
    models = app.objection.models;
    
    // Intenta crear tablas manualmente si no existen
    try {
      const hasUsersTable = await knex.schema.hasTable('users');
      if (!hasUsersTable) {
        await knex.schema.createTable('users', (table) => {
          table.increments('id').primary();
          table.string('first_name');
          table.string('last_name');
          table.string('email');
          table.string('password_digest');
          table.timestamps(true, true);
        });
      }
      
      // Preparar datos base (usuarios)
      await prepareData(app);
      
      // Preparar datos específicos para pruebas de tareas
      await prepareTaskData(app);
    } catch (err) {
      console.error('Error al configurar la base de datos:', err);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  // Verificar que la ruta para listar tareas existe
  it('index', async () => {
    const response = await app.inject({
      method: 'GET',
      url: app.reverse('tasks'),
    });
    expect(response.statusCode).toEqual(200);
  });

  // Verificar que la ruta para crear tareas existe y requiere autenticación
  it('new', async () => {
    const response = await app.inject({
      method: 'GET',
      url: app.reverse('newTask'),
    });
    expect(response.statusCode).toEqual(302);
  });

  // Verificar que la ruta para crear tareas funciona con autenticación
  it('new with auth', async () => {
    const cookie = await signIn(app, testData.users.existing);
    const response = await app.inject({
      method: 'GET',
      url: app.reverse('newTask'),
      cookies: cookie,
    });
    expect(response.statusCode).toEqual(200);
  });

  // Verificar creación de tarea
  it('create task', async () => {
    const taskData = {
      name: 'Tarea de prueba',
      statusId: 1,
      description: 'Descripción de tarea de prueba',
    };
    
    const { response } = await createTestTask(app, testData.users.existing, taskData);
    expect(response.statusCode).toEqual(302);
  });

  // Verificar que las rutas para manipular tareas existen
  it('routes exist', async () => {
    expect(app.hasRoute({
      method: 'GET',
      url: app.reverse('tasks'),
    })).toBeTruthy();
    
    expect(app.hasRoute({
      method: 'GET',
      url: app.reverse('newTask'),
    })).toBeTruthy();
    
    expect(app.hasRoute({
      method: 'POST',
      url: app.reverse('createTask'),
    })).toBeTruthy();
    
    expect(app.hasRoute({
      method: 'GET',
      url: app.reverse('showTask', { id: 1 }),
    })).toBeTruthy();
    
    expect(app.hasRoute({
      method: 'GET',
      url: app.reverse('editTask', { id: 1 }),
    })).toBeTruthy();
    
    expect(app.hasRoute({
      method: 'PATCH',
      url: app.reverse('updateTask', { id: 1 }),
    })).toBeTruthy();
    
    expect(app.hasRoute({
      method: 'DELETE',
      url: app.reverse('deleteTask', { id: 1 }),
    })).toBeTruthy();
    
    expect(app.hasRoute({
      method: 'POST',
      url: app.reverse('postDeleteTask', { id: 1 }),
    })).toBeTruthy();
  });
});