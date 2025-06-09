// server/migrations/20210711232718_create_tasks_table.js
/**
 * @param {import('knex')} knex
 */
export const up = (knex) => (
    knex.schema.createTable('tasks', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.text('description');
      table.integer('status_id').unsigned().notNullable()
        .references('id').inTable('statuses').onDelete('RESTRICT');
      table.integer('creator_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('RESTRICT');
      table.integer('executor_id').unsigned()
        .references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
  );
  
  export const down = (knex) => knex.schema.dropTable('tasks');