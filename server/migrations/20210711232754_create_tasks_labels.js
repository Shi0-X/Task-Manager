// server/migrations/20210711232754_create_tasks_labels.js
/**
 * @param {import('knex')} knex
 */
export const up = (knex) => (
  knex.schema.createTable('tasks_labels', (table) => {
    table.increments('id').primary();
    table.integer('task_id').unsigned().notNullable()
      .references('id')
      .inTable('tasks')
      .onDelete('CASCADE');
    table.integer('label_id').unsigned().notNullable()
      .references('id')
      .inTable('labels')
      .onDelete('RESTRICT');
    table.unique(['task_id', 'label_id']);