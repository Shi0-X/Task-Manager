// server/migrations/20210711232742_create_labels_table.js
/* eslint-disable */
/**
 * @param {import('knex')} knex
 */
export const up = (knex) => (
  knex.schema.createTable('labels', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  })
);
  
export const down = (knex) => knex.schema.dropTable('labels');
