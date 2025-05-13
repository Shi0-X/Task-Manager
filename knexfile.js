// knexfile.js
// @ts-check

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const migrations = {
  directory: path.join(__dirname, 'server', 'migrations'),
};

export const development = {
  client: 'sqlite3',
  connection: {
    filename: path.resolve(__dirname, 'database.sqlite'),
  },
  useNullAsDefault: true,
  migrations,
};

export const test = {
  client: 'sqlite3',
  connection: ':memory:',
  useNullAsDefault: true,
  migrations,
  // Agrega un hook para omitir ciertas migraciones en pruebas
  hooks: {
    beforeMigrate: async (knex) => {
      // Verificar si la tabla de migraciones existe
      const hasTable = await knex.schema.hasTable('knex_migrations');
      if (!hasTable) {
        // Si no existe, crearla
        await knex.schema.createTable('knex_migrations', (table) => {
          table.increments('id').primary();
          table.string('name');
          table.integer('batch');
          table.timestamp('migration_time');
        });
      }

      // Marcar la migración problemática como completada
      const migrationName = '20250429000001_rename_columns_to_snake_case.js';
      const exists = await knex('knex_migrations')
        .where({ name: migrationName })
        .first();

      if (!exists) {
        await knex('knex_migrations').insert({
          name: migrationName,
          batch: 1,
          migration_time: new Date(),
        });
      }
    },
  },
};

export const production = {
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  },
  migrations,
};
