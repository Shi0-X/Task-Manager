// @ts-check

import { URL } from 'url';
import fs from 'fs';
import path from 'path';
import { faker } from '@faker-js/faker';
import knex from 'knex';
import * as knexConfig from '../../knexfile.js';
import encrypt from '../../server/lib/secure.cjs';

// Crear una conexión directa a la base de datos para las pruebas
const testKnex = knex(knexConfig.test);

const getFixturePath = (filename) => path.join('..', '..', '__fixtures__', filename);
const readFixture = (filename) => fs.readFileSync(new URL(getFixturePath(filename), import.meta.url), 'utf-8').trim();
const getFixtureData = (filename) => JSON.parse(readFixture(filename));

export const getTestData = () => {
  const fixtureData = getFixtureData('testData.json');
  
  // Añadir datos faltantes usando faker y adaptándolos a la estructura de la base de datos
  return {
    users: {
      new: {
        email: fixtureData.users.new.email,
        password: fixtureData.users.new.password
      },
      existing: {
        email: fixtureData.users.existing.email,
        password: fixtureData.users.existing.password
      },
    },
  };
};

export const prepareData = async (app) => {
  try {
    console.log('Preparando base de datos para pruebas...');
    
    // Ejecutar migraciones si no se han ejecutado
    await testKnex.migrate.latest();
    console.log('Migraciones ejecutadas correctamente');
    
    // Verificar que la tabla users existe
    const hasTable = await testKnex.schema.hasTable('users');
    if (!hasTable) {
      throw new Error('La tabla users no existe después de ejecutar migraciones');
    }
    
    // Verificar la estructura de la tabla
    const columns = await testKnex('users').columnInfo();
    console.log('Columnas en la tabla users:', Object.keys(columns));
    
    // Limpiar datos existentes
    await testKnex('users').del();
    console.log('Tabla users limpiada correctamente');
    
    // Obtener datos de usuario existentes
    const usersData = getFixtureData('users.json');
    console.log(`Cargando ${usersData.length} usuarios de prueba`);
    
    // Insertar los usuarios uno por uno para evitar problemas con la sintaxis UNION ALL
    for (const user of usersData) {
      await testKnex('users').insert({
        email: user.email,
        password_digest: user.passwordDigest
      });
    }
    
    console.log('Datos de prueba cargados correctamente');
    return true;
  } catch (error) {
    console.error('Error al preparar datos de prueba:', error);
    
    // Imprimir información de depuración adicional
    if (error.message && error.message.includes('no such table')) {
      console.log('La tabla no existe. Intentando obtener todas las tablas disponibles...');
      try {
        // En SQLite, podemos verificar todas las tablas disponibles
        const tables = await testKnex.raw("SELECT name FROM sqlite_master WHERE type='table'");
        console.log('Tablas disponibles:', tables);
      } catch (e) {
        console.error('Error al intentar listar tablas:', e);
      }
    }
    
    throw error;
  }
};

// Función para añadir un usuario simple para pruebas
export const addTestUser = async (userData) => {
  try {
    return await testKnex('users').insert({
      email: userData.email,
      password_digest: encrypt(userData.password)
    });
  } catch (error) {
    console.error('Error al añadir usuario de prueba:', error);
    throw error;
  }
};

// Asegúrate de cerrar la conexión cuando terminen todas las pruebas
export const closeTestConnection = async () => {
  await testKnex.destroy();
};