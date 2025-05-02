// @ts-check
import knex from 'knex';
import * as knexConfig from '../../knexfile.js';

// Función para crear una instancia de base de datos limpia para pruebas
export const createTestDatabase = async () => {
  // Crear una instancia de Knex con la configuración de prueba
  const db = knex(knexConfig.test);
  
  // Ejecutar migraciones para crear las tablas necesarias
  await db.migrate.latest();
  
  // Crear la tabla de usuarios manualmente si no existe
  const hasUsersTable = await db.schema.hasTable('users');
  if (!hasUsersTable) {
    await db.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('first_name');
      table.string('last_name');
      table.string('email');
      table.string('password_digest');
      table.timestamps(true, true);
    });
  }
  
  return db;
};

// Función para limpiar la base de datos
export const cleanDatabase = async (db) => {
  const tables = ['users']; // Agregar más tablas si es necesario
  
  for (const table of tables) {
    const exists = await db.schema.hasTable(table);
    if (exists) {
      await db(table).delete();
    }
  }
};

// Función para cerrar la conexión a la base de datos
export const closeDatabase = async (db) => {
  await db.destroy();
};