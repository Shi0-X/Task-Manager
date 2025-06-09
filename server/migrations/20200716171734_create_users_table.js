// server/migrations/20210711224051_create_users_table.js
// @ts-check

export const up = (knex) =>
  knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('first_name').notNullable();   // <— lo agregamos
    table.string('last_name').notNullable();    // <— lo agregamos
    table.string('email').notNullable();
    table.string('password_digest').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

export const down = (knex) => knex.schema.dropTable('users');
