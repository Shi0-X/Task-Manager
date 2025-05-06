// server/routes/users.js
// @ts-check

import i18next from 'i18next';

export default (app) => {
  // Middleware de autorización - solo el propio usuario puede editar/eliminar su cuenta
  const checkOwnership = async (req, reply) => {
    const { id } = req.params;
    
    console.log('Verificando autorización:');
    console.log('- ID del parámetro:', id);
    console.log('- Usuario actual:', req.user ? `ID: ${req.user.id}, Email: ${req.user.email}` : 'No autenticado');
    
    // Si el usuario no está autenticado o el ID no coincide con el usuario actual
    if (!req.user || String(req.user.id) !== id) {
      console.log('Acceso denegado: El usuario no es propietario de este recurso');
      req.flash('error', i18next.t('flash.user.accessError'));
      return reply.redirect(app.reverse('users'));
    }
    
    console.log('Autorización concedida: El usuario es propietario del recurso');
    return true; // continuar con el siguiente handler
  };

  app
    // 1) Listado de usuarios (accesible para todos)
    .get('/users', { name: 'users' }, async (req, reply) => {
      const users = await app.objection.models.user.query();
      
      // Depuración - información sobre el usuario actual
      console.log('Renderizando lista de usuarios:');
      console.log('- Usuario autenticado:', req.isAuthenticated());
      if (req.user) {
        console.log('- Información del usuario actual:', {
          id: req.user.id,
          email: req.user.email
        });
      }
      
      // Verificar lo que se está pasando a la vista
      console.log('Pasando a la vista - currentUser:', req.user ? `ID: ${req.user.id}` : 'undefined');
      
      // Asegurarse de que currentUser esté disponible en la vista
      return reply.render('users/index', { 
        users,
        currentUser: req.user  // Asegurar que esté pasado explícitamente
      });
    })

    // 2) Formulario de registro
    .get('/users/new', { name: 'newUser' }, (req, reply) => {
      const user = new app.objection.models.user();
      // Siempre pasamos "errors" para que pug no falle
      return reply.render('users/new', { user, errors: {} });
    })

    // 3) Crear usuario
    .post('/users', async (req, reply) => {
      try {
        // Logging para depuración
        console.log('Datos del formulario recibidos:', req.body.data);
        
        // Asegurarnos de que tenemos los datos correctos
        const userData = req.body.data || {};
        
        // Crear y validar el usuario
        const validUser = await app.objection.models.user.fromJson(userData);
        
        // Insertar el usuario en la base de datos
        await app.objection.models.user.query().insert(validUser);
        
        req.flash('info', i18next.t('flash.user.create.success'));
        return reply.redirect(app.reverse('users'));
      } catch (err) {
        // Depuramos en consola con más detalles
        console.error('Error al registrar usuario:', err);
        console.error('Detalles del error:', JSON.stringify(err, null, 2));
        
        // Preparamos el usuario para volver a renderizar el formulario
        const user = new app.objection.models.user();
        user.$set(req.body.data || {});
        
        // Extraemos errores de validación si existen
        const validationErrors = err.data || {};
        
        req.flash('error', i18next.t('flash.user.create.error'));
        return reply.render('users/new', { user, errors: validationErrors });
      }
    })

    // 4) Formulario de edición (sólo para usuarios autenticados y dueños de la cuenta)
    .get(
      '/users/:id/edit',
      { 
        name: 'editUser', 
        preValidation: [app.authenticate, checkOwnership] 
      },
      async (req, reply) => {
        const { id } = req.params;
        const user = await app.objection.models.user.query().findById(id);
        if (!user) {
          req.flash('error', i18next.t('flash.user.notFound'));
          return reply.redirect(app.reverse('users'));
        }
        // Pasamos errors vacío
        return reply.render('users/edit', { user, errors: {} });
      }
    )

    // 5) Actualizar usuario (sólo para usuarios autenticados y dueños de la cuenta)
    .patch(
      '/users/:id',
      { 
        name: 'updateUser', 
        preValidation: [app.authenticate, checkOwnership] 
      },
      async (req, reply) => {
        const { id } = req.params;
        try {
          const userData = req.body.data || {};
          
          // Logging para depuración
          console.log('Datos para actualización:', userData);
          
          // Validar que todos los campos requeridos estén presentes
          if (!userData.firstName || !userData.lastName || !userData.email) {
            throw new Error('Campos requeridos faltantes');
          }
          
          // Acceder directamente a la base de datos a través de knex
          // Esto evita completamente el uso del plugin objection-unique
          const knex = app.objection.knex;
          
          // Preparar datos para actualización
          const updateData = {
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email
          };
          
          // Solo incluir password si se proporcionó uno nuevo
          if (userData.password && userData.password.trim() !== '') {
            // Utilizar el setter de password del modelo para encriptar
            const userInstance = new app.objection.models.user();
            userInstance.password = userData.password;
            updateData.passwordDigest = userInstance.passwordDigest;
          }
          
          // Verificar primero si ya existe otro usuario con ese email (excepto el actual)
          const existingUserWithEmail = await knex('users')
            .where('email', userData.email)
            .whereNot('id', id)
            .first();
          
          if (existingUserWithEmail) {
            throw new Error('Este email ya está siendo utilizado por otro usuario');
          }
          
          // Actualizar directamente con knex
          await knex('users')
            .where('id', id)
            .update(updateData);
          
          req.flash('info', i18next.t('flash.user.edit.success'));
          return reply.redirect(app.reverse('users'));
        } catch (err) {
          console.error('Error al actualizar usuario:', err);
          console.error('Detalles del error:', JSON.stringify(err, null, 2));
          
          // Obtener el usuario actual para rellenar el formulario
          const user = await app.objection.models.user.query().findById(id);
          
          // Si tenemos datos del formulario, los usamos para mantener lo que el usuario ingresó
          if (req.body.data) {
            user.$set(req.body.data);
          }
          
          // Preparar errores de validación
          const validationErrors = err.data || {};
          if (err.message === 'Este email ya está siendo utilizado por otro usuario') {
            // Añadir error específico para email duplicado
            validationErrors.email = [{ message: 'Este email ya está en uso' }];
          }
          
          req.flash('error', i18next.t('flash.user.edit.error'));
          return reply.render('users/edit', { user, errors: validationErrors });
        }
      }
    )

    // 6) Eliminar usuario (sólo para usuarios autenticados y dueños de la cuenta)
    .delete(
      '/users/:id',
      { 
        name: 'deleteUser', 
        preValidation: [app.authenticate, checkOwnership] 
      },
      async (req, reply) => {
        const { id } = req.params;
        try {
          // Si el usuario se está borrando a sí mismo, salimos de sesión primero
          if (req.user && String(req.user.id) === id) {
            await req.logOut();
          }
          
          await app.objection.models.user.query().deleteById(id);
          
          req.flash('info', i18next.t('flash.user.delete.success'));
          return reply.redirect(app.reverse('users'));
        } catch (err) {
          console.error('Error al eliminar usuario:', err);
          req.flash('error', i18next.t('flash.user.delete.error'));
          return reply.redirect(app.reverse('users'));
        }
      }
    );
};