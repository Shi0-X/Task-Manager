// __tests__/helpers/labels.js

// Función para preparar datos de etiquetas para las pruebas
export const prepareLabelsData = async (app) => {
  const { knex } = app.objection;

  // Verificar si las tablas existen, y crearlas si no
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
    // No lanzar el error, para permitir que las pruebas continúen
  }
};
