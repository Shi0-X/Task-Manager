// server/migrations/20210711223947_create_statuses_table.js
/* eslint-disable */
/**
 * @param {import('knex')} knex
 */
export const up = (knex) => (
  knex.schema.createTable('statuses', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  })
);
  
export const down = (knex) => knex.schema.dropTable('statuses');
