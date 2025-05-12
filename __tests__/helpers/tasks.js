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
    
    // Verificar/crear tabla labels
    const hasLabelsTable = await knex.schema.hasTable('labels');
    if (!hasLabelsTable) {
      await knex.schema.createTable('labels', (table) => {
        table.increments('id').primary();
        table.string('name');
        table.timestamps(true, true);
      });
    }
    
    // Verificar/crear tabla tasks_labels
    const hasTasksLabelsTable = await knex.schema.hasTable('tasks_labels');
    if (!hasTasksLabelsTable) {
      await knex.schema.createTable('tasks_labels', (table) => {
        table.increments('id').primary();
        table.integer('task_id').references('id').inTable('tasks');
        table.integer('label_id').references('id').inTable('labels');
        table.unique(['task_id', 'label_id']);
        table.timestamps(true, true);
      });
    }
    
    // Insertar datos de prueba para estados
    try {
      await knex('statuses').insert([
        { id: 1, name: 'nuevo' },
        { id: 2, name: 'en trabajo' },
        { id: 3, name: 'en prueba' },
        { id: 4, name: 'completado' }
      ]);
    } catch (err) {
      // Ignorar errores de duplicación
      console.log('Nota: Es posible que los estados ya existan');
    }
    
    // Insertar datos de prueba para etiquetas
    try {
      await knex('labels').insert([
        { id: 1, name: 'bug' },
        { id: 2, name: 'feature' },
        { id: 3, name: 'documentation' }
      ]);
    } catch (err) {
      // Ignorar errores de duplicación
      console.log('Nota: Es posible que las etiquetas ya existan');
    }
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