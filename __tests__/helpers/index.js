// __tests__/helpers/index.js

import { URL } from 'url';
import fs from 'fs';
import path from 'path';
import knex from 'knex';
import * as knexConfig from '../../knexfile.js';
import encrypt from '../../server/lib/secure.cjs';

const testKnexInstance = knex(knexConfig.test);

const getFixturePath = (filename) => path.join('..', '..', '__fixtures__', filename);
const readFixture = (filename) => fs.readFileSync(new URL(getFixturePath(filename), import.meta.url), 'utf-8').trim();
const getFixtureData = (filename) => JSON.parse(readFixture(filename));

export const getTestData = () => getFixtureData('testData.json');

export const prepareData = async (app) => {
  const { knex: appKnex } = app.objection;

  // Solo insertar los usuarios, como lo hacía originalmente
  await appKnex('users').insert(getFixtureData('users.json'));
  // NO agregar estados ni tareas aquí para mantener la compatibilidad
};

export const signIn = async (app, data) => {
  const response = await app.inject({
    method: 'POST',
    url: app.reverse('session'),
    payload: {
      data,
    },
  });

  const [sessionCookie] = response.cookies;
  const { name, value } = sessionCookie;
  return { [name]: value };
};

export const addTestUser = async (userData) => {
  try {
    return await testKnexInstance('users').insert({
      first_name: userData.firstName,
      last_name: userData.lastName,
      email: userData.email,
      password_digest: encrypt(userData.password),
    });
  } catch (error) {
    console.error('Error al añadir usuario de prueba:', error);
    throw error;
  }
};

export const closeTestConnection = async () => {
  await testKnexInstance.destroy();
};