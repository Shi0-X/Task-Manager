// server/migrations/20210711232754_create_tasks_labels.js
/* eslint-disable */
/**
 * @param {import('knex')} knex
 */
export const up = (knex) => (
  knex.schema.createTable('tasks_labels', (table) => {
    table.increments('id').primary();
    table.integer('task_id').unsigned().notNullable()
      .references('id').inTable('tasks').onDelete('CASCADE');
    table.integer('label_id').unsigned().notNullable()
      .references('id').inTable('labels').onDelete('RESTRICT');
    table.unique(['task_id', 'label_id']);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  })
);
  
export const down = (knex) => knex.schema.dropTable('tasks_labels');
