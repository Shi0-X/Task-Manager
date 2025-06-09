// __tests__/helpers/index.js
// @ts-check

import { faker } from '@faker-js/faker';
// CORRECCIÓN: La ruta de importación ahora es correcta.
import encrypt from '../server/lib/secure.js';

// Datos de test predefinidos
export const getTestData = () => ({
  users: {
    new: {
      firstName: faker.person.firstName(),
      // CORRECCIÓN: Se eliminó el espacio sobrante al final de la línea.
      lastName: faker.person.lastName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
    },
    existing: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'password123',
    },
  },
  statuses: {
    new: {
      name: faker.lorem.word(),
    },
    existing: {
      name: 'In Progress',
    },
  },
  labels: {
    new: {
      name: faker.lorem.word(),
    },
    existing: {
      name: 'Bug',
    },
  },
  tasks: {
    new: {
      name: faker.lorem.sentence(),
      description: faker.lorem.paragraph(),
    },
    existing: {
      name: 'Test Task',
      description: 'Test task description',
    },
  },
});

// Función para preparar datos de etiquetas
export const prepareLabelsData = async (app) => {
  const { knex } = app.objection;

  try {
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

    // Verificar/crear tabla statuses si no existe
    const hasStatusesTable = await knex.schema.hasTable('statuses');
    if (!hasStatusesTable) {
      await knex.schema.createTable('statuses', (table) => {
        table.increments('id').primary();
        table.string('name');
        table.timestamps(true, true);
      });

      // Insertar datos de prueba
      await knex('statuses').insert([
        { id: 1, name: 'nuevo' },
      ]);
    }

    // Verificar/crear tabla tasks si no existe
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

    // Insertar algunas etiquetas de prueba
    try {
      await knex('labels').insert([
        { id: 1, name: 'bug' },
        { id: 2, name: 'feature' },
        { id: 3, name: 'documentation' },
      ]);
    } catch (error) {
      console.log('Etiquetas de prueba posiblemente ya existentes');
    }
  } catch (error) {
    console.warn('Error al preparar datos de etiquetas:', error.message);
  }
};

// Función principal de preparación de datos
export const prepareData = async (app) => {
  const { knex } = app.objection;

  // CORRECCIÓN: Se eliminaron líneas con espacios sobrantes.
  try {
    // Limpiar datos existentes
    await knex.raw('PRAGMA foreign_keys = OFF');

    // Limpiar en orden por dependencias
    await knex('tasks_labels').del();
    await knex('tasks').del();
    await knex('labels').del();
    await knex('statuses').del();
    await knex('users').del();

    await knex.raw('PRAGMA foreign_keys = ON');

    const testData = getTestData();

    // Crear usuario de prueba
    const hashedPassword = encrypt(testData.users.existing.password);
    await knex('users').insert({
      id: 1,
      first_name: testData.users.existing.firstName,
      last_name: testData.users.existing.lastName,
      email: testData.users.existing.email,
      password_digest: hashedPassword,
    });

    // Crear estados de prueba
    await knex('statuses').insert([
      { id: 1, name: 'nuevo' },
      { id: 2, name: 'en progreso' },
      { id: 3, name: 'terminado' },
    ]);

    // Crear etiquetas de prueba
    await knex('labels').insert([
      { id: 1, name: 'bug' },
      { id: 2, name: 'feature' },
      { id: 3, name: 'documentation' },
    ]);

    // Preparar datos específicos de etiquetas
    await prepareLabelsData(app);

    console.log('Datos de prueba preparados exitosamente');
  } catch (error) {
    console.error('Error preparando datos de prueba:', error);
    throw error;
  }
};

// Función para iniciar sesión en pruebas
export const signIn = async (app, userData) => {
  const response = await app.inject({
    method: 'POST',
    url: app.reverse('session'),
    payload: {
      data: {
        email: userData.email,
        password: userData.password,
      },
    },
  });

  // CORRECCIÓN: Usar desestructuración de objetos.
  const { cookies } = response;
  if (cookies && cookies.length > 0) {
    // CORRECCIÓN: Añadir paréntesis al argumento de la función flecha.
    return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
  }

  return '';
};