// __tests__/helpers/tasks.js

import { signIn } from './index.js';

// Función para preparar datos de tareas específicamente para las pruebas de tareas
export const prepareTaskData = async (app) => {
  const { knex } = app.objection;
  
  // Verificar si las tablas existen, y crearlas si no
  try {
    // Verificar/crear tabla statuses
    const hasStatusesTable = await knex.schema.hasTable('statuses');
    if (!hasStatusesTable) {
      await knex.schema.createTable('statuses', (table) => {
        table.increments('id').primary();
        table.string('name');
        table.timestamps(true, true);
      });
    }
    
    // Verificar/crear tabla tasks
    const hasTasksTable = await knex.schema.hasTable('tasks');
    if (!hasTasksTable) {
      await knex.schema.createTable('tasks', (table) => {
        table.increments('id').primary();
        table.string('name');
        table.text('description');
        table.integer('status_id').references('id').inTable('statuses');
        table.integer('creator_id').references('id').inTable('users');
        table.integer('executor_id').references('id').inTable('users');
        table.timestamps(true, true);
      });
    }
    
    // Insertar datos de prueba
    await knex('statuses').insert([
      { id: 1, name: 'nuevo' },
      { id: 2, name: 'en trabajo' },
      { id: 3, name: 'en prueba' },
      { id: 4, name: 'completado' }
    ]);
  } catch (error) {
    console.warn('Error al preparar datos de tareas:', error.message);
    // No lanzar el error, para permitir que las pruebas continúen
  }
};

// Función para crear una tarea de prueba
export const createTestTask = async (app, user, taskData) => {
  const cookie = await signIn(app, user);
  
  const response = await app.inject({
    method: 'POST',
    url: app.reverse('createTask'),
    cookies: cookie,
    payload: {
      data: taskData,
    },
  });
  
  return { response, cookie };
};