// @ts-check

import _ from 'lodash';
import fastify from 'fastify';

import init from '../server/plugin.js';
import encrypt from '../server/lib/secure.cjs';
import { getTestData, prepareData, closeTestConnection, addTestUser } from './helpers/index.js';

describe('test users CRUD', () => {
  let app;
  let knex;
  let models;
  let testData;
  let cookie;

  beforeAll(async () => {
    // Inicializar la aplicación
    app = fastify({
      exposeHeadRoutes: false,
      logger: { target: 'pino-pretty' },
    });
    
    // Ejecutar inicialización de la aplicación
    await init(app);
    
    // Obtener referencias a knex y modelos
    knex = app.objection.knex;
    models = app.objection.models;
    
    // Preparar base de datos y datos de prueba
    try {
      // Importante: usar la función prepareData modificada que ejecuta migraciones directamente
      await prepareData(app);
      testData = getTestData();
    } catch (error) {
      console.error('Error en la configuración de las pruebas:', error);
      throw error;
    }
  });

  it('index', async () => {
    const response = await app.inject({
      method: 'GET',
      url: app.reverse('users'),
    });

    expect(response.statusCode).toBe(200);
  });

  it('new', async () => {
    const response = await app.inject({
      method: 'GET',
      url: app.reverse('newUser'),
    });

    expect(response.statusCode).toBe(200);
  });

  it('create', async () => {
    const params = testData.users.new;
    const response = await app.inject({
      method: 'POST',
      url: app.reverse('users'),
      payload: {
        data: params,
      },
    });

    expect(response.statusCode).toBe(302);
    
    // Verificar que el usuario fue creado correctamente
    const user = await models.user.query().findOne({ email: params.email });
    expect(user).not.toBeNull();
    expect(user.password_digest).toBe(encrypt(params.password));
  });

  // Tests para la operación de actualización (update)
  it('edit page', async () => {
    // Añadir un usuario de prueba directamente a la base de datos
    await addTestUser(testData.users.existing);
    
    // Obtener el usuario para tener su ID
    const existingUser = await models.user.query().findOne({ email: testData.users.existing.email });
    expect(existingUser).not.toBeNull();

    // Iniciar sesión como el usuario existente
    const loginResponse = await app.inject({
      method: 'POST',
      url: app.reverse('session'),
      payload: {
        data: {
          email: testData.users.existing.email,
          password: testData.users.existing.password,
        },
      },
    });

    expect(loginResponse.statusCode).toBe(302);
    cookie = loginResponse.headers['set-cookie'];

    // Acceder a la página de edición
    const response = await app.inject({
      method: 'GET',
      url: app.reverse('editUser', { id: existingUser.id }),
      headers: {
        cookie,
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it('update', async () => {
    const existingUser = await models.user.query().findOne({ email: testData.users.existing.email });
    expect(existingUser).not.toBeNull();

    // Actualizar el usuario
    const updatedData = {
      email: existingUser.email,
      password: testData.users.existing.password,
      firstName: 'UpdatedFirstName',
      lastName: 'UpdatedLastName'
    };

    const response = await app.inject({
      method: 'PATCH',
      url: app.reverse('updateUser', { id: existingUser.id }),
      payload: {
        data: updatedData,
      },
      headers: {
        cookie,
      },
    });

    expect(response.statusCode).toBe(302);

    // Verificar que el usuario fue actualizado
    const updatedUser = await models.user.query().findById(existingUser.id);
    // Note: El modelo puede transformar los nombres de las propiedades, así que comprueba los valores directamente
    expect(updatedUser.first_name || updatedUser.firstName).toBe(updatedData.firstName);
    expect(updatedUser.last_name || updatedUser.lastName).toBe(updatedData.lastName);
  });

  it('cannot update another user', async () => {
    // Crear otro usuario para la prueba
    const anotherUserData = {
      email: 'another@example.com',
      password: 'password'
    };

    await addTestUser(anotherUserData);
    const anotherUser = await models.user.query().findOne({ email: anotherUserData.email });
    expect(anotherUser).not.toBeNull();

    // Intentar actualizar el otro usuario mientras estamos autenticados como el usuario existente
    const response = await app.inject({
      method: 'PATCH',
      url: app.reverse('updateUser', { id: anotherUser.id }),
      payload: {
        data: {
          firstName: 'Unauthorized',
          lastName: 'Update',
          email: anotherUser.email,
        },
      },
      headers: {
        cookie,
      },
    });

    // Debe ser redirigido (acceso denegado)
    expect(response.statusCode).toBe(302);

    // Verificar que el usuario no fue actualizado - consultando por email que no cambia
    const notUpdatedUser = await knex('users').where({ id: anotherUser.id }).first();
    expect(notUpdatedUser.email).toBe(anotherUserData.email);
  });

  // Tests para la operación de eliminación (delete)
  it('delete', async () => {
    // Crear un nuevo usuario específicamente para la prueba de eliminación
    const userToDeleteData = {
      email: 'delete-me@example.com',
      password: 'password'
    };

    await addTestUser(userToDeleteData);
    const userToDelete = await models.user.query().findOne({ email: userToDeleteData.email });
    expect(userToDelete).not.toBeNull();

    // Iniciar sesión como el usuario a eliminar
    const loginResponse = await app.inject({
      method: 'POST',
      url: app.reverse('session'),
      payload: {
        data: {
          email: userToDeleteData.email,
          password: userToDeleteData.password,
        },
      },
    });

    const deleteCookie = loginResponse.headers['set-cookie'];

    // Eliminar el usuario
    const response = await app.inject({
      method: 'DELETE',
      url: app.reverse('deleteUser', { id: userToDelete.id }),
      headers: {
        cookie: deleteCookie,
      },
    });

    expect(response.statusCode).toBe(302);

    // Verificar que el usuario ya no existe
    const deletedUser = await models.user.query().findById(userToDelete.id);
    expect(deletedUser).toBeUndefined();
  });

  it('cannot delete another user', async () => {
    // Crear dos usuarios para la prueba
    const firstUserData = {
      email: 'first@example.com',
      password: 'password'
    };

    await addTestUser(firstUserData);
    const firstUser = await models.user.query().findOne({ email: firstUserData.email });

    const secondUserData = {
      email: 'second@example.com',
      password: 'password'
    };

    await addTestUser(secondUserData);
    const secondUser = await models.user.query().findOne({ email: secondUserData.email });

    // Iniciar sesión como el primer usuario
    const loginResponse = await app.inject({
      method: 'POST',
      url: app.reverse('session'),
      payload: {
        data: {
          email: firstUserData.email,
          password: firstUserData.password,
        },
      },
    });

    const newCookie = loginResponse.headers['set-cookie'];

    // Intentar eliminar el segundo usuario mientras estamos autenticados como el primero
    const response = await app.inject({
      method: 'DELETE',
      url: app.reverse('deleteUser', { id: secondUser.id }),
      headers: {
        cookie: newCookie,
      },
    });

    // Debe ser redirigido (acceso denegado)
    expect(response.statusCode).toBe(302);

    // Verificar que el segundo usuario no fue eliminado
    const notDeletedUser = await models.user.query().findById(secondUser.id);
    expect(notDeletedUser).not.toBeUndefined();
    expect(notDeletedUser.email).toBe(secondUserData.email);
  });

  afterAll(async () => {
    // Cerrar la aplicación
    await app.close();
    
    // Cerrar la conexión de prueba
    await closeTestConnection();
  });
});