// server/routes/tasks.js
// @ts-check

import i18next from 'i18next';
import _ from 'lodash';

export default (app) => {
  // Middleware para verificar que solo el creador pueda eliminar/modificar la tarea
  // (Ajustado para ser más genérico si se usa en editar también)
  const checkTaskCreatorOrAdmin = async (req, reply) => {
    const { id } = req.params;
    const task = await app.objection.models.task.query().findById(id);

    if (!task) {
      req.flash('error', i18next.t('flash.task.view.error')); // Tarea no encontrada
      return reply.redirect(app.reverse('tasks'));
    }

    // Permitir si el usuario es el creador o si se implementa un rol de administrador
    // if (req.user.id !== task.creatorId && !req.user.isAdmin) { // Ejemplo con admin
    if (req.user.id !== task.creatorId) {
      req.flash('error', i18next.t('flash.task.authError')); // Mensaje más genérico de autorización
      return reply.redirect(app.reverse('tasks'));
    }
    return true; // Pasa la validación
  };


  app
    // 1. Lista de tareas
    .get('/tasks', { name: 'tasks' }, async (req, reply) => {
      try {
        const filter = {};
        if (req.query.status && req.query.status !== '') {
          filter.statusId = Number(req.query.status); // Corregido a statusId para el where
        }
        if (req.query.executor && req.query.executor !== '') {
          filter.executorId = Number(req.query.executor); // Corregido a executorId
        }
        if (req.query.label && req.query.label !== '') {
          filter.labelId = Number(req.query.label); // Usar labelId para claridad
        }
        if (req.query.isCreatorUser === 'on' && req.user) { // Solo aplicar si el checkbox está marcado Y hay un usuario logueado
          filter.creatorId = req.user.id;
        }

        const statuses = await app.objection.models.taskStatus.query();
        const users = await app.objection.models.user.query();
        const labels = await app.objection.models.label.query();

        let query = app.objection.models.task.query()
          .withGraphJoined('[status, creator, executor, labels]')
          .orderBy('tasks.createdAt', 'desc'); // Opcional: ordenar tareas

        if (filter.statusId) {
          query = query.where('tasks.statusId', filter.statusId);
        }
        if (filter.executorId) {
          query = query.where('tasks.executorId', filter.executorId);
        }
        if (filter.creatorId) { // Ya tenemos req.user.id aquí
          query = query.where('tasks.creatorId', filter.creatorId);
        }
        if (filter.labelId) {
          query = query
            .joinRelated('labels') // Asegurar que la tabla de unión esté disponible
            .where('labels.id', filter.labelId);
        }

        const tasks = await query;

        return reply.render('tasks/index', {
          tasks,
          statuses,
          users,
          labels,
          filterParams: req.query, // Pasar los query params originales para rellenar el filtro
          currentUser: req.user,
        });
      } catch (err) {
        console.error('Error al obtener tareas:', err);
        req.flash('error', 'Failed to load tasks');
        return reply.redirect(app.reverse('root'));
      }
    })

    // 2. Formulario para crear una tarea
    .get('/tasks/new', {
      name: 'newTask',
      preValidation: app.authenticate,
    }, async (req, reply) => {
      try {
        const task = new app.objection.models.task(); // Instancia vacía para el formulario
        const statuses = await app.objection.models.taskStatus.query();
        const users = await app.objection.models.user.query();
        const labels = await app.objection.models.label.query();

        return reply.render('tasks/new', {
          task, // task vacía
          statuses,
          users,
          labels,
          currentUser: req.user,
          errors: {}, // Inicializar errors vacío
        });
      } catch (err) {
        console.error('Error al cargar formulario de nueva tarea:', err);
        req.flash('error', 'Failed to load task form');
        return reply.redirect(app.reverse('tasks'));
      }
    })

    // 3. Ver detalles de una tarea (Solo usuarios autenticados)
    .get('/tasks/:id', {
      name: 'showTask',
      preValidation: app.authenticate, // Asegurar que el usuario esté logueado para ver tareas
    }, async (req, reply) => {
      try {
        const { id } = req.params;
        const task = await app.objection.models.task.query()
          .findById(id)
          .withGraphJoined('[status, creator, executor, labels]');

        if (!task) {
          req.flash('error', i18next.t('flash.task.view.error'));
          return reply.redirect(app.reverse('tasks'));
        }

        return reply.render('tasks/show', {
          task,
          currentUser: req.user,
        });
      } catch (err) {
        console.error('Error al ver detalles de tarea:', err);
        req.flash('error', 'Failed to view task details');
        return reply.redirect(app.reverse('tasks'));
      }
    })

    // 4. Formulario para editar una tarea
    .get('/tasks/:id/edit', {
      name: 'editTask',
      // checkTaskCreatorOrAdmin podría ser útil aquí también si solo el creador puede editar
      preValidation: [app.authenticate /*, checkTaskCreatorOrAdmin */],
    }, async (req, reply) => {
      try {
        const { id } = req.params;
        const task = await app.objection.models.task.query()
          .findById(id)
          .withGraphFetched('labels'); // withGraphFetched es más eficiente si solo necesitas las etiquetas para el form

        if (!task) {
          req.flash('error', i18next.t('flash.task.view.error'));
          return reply.redirect(app.reverse('tasks'));
        }

        // Verificar si el usuario actual es el creador antes de mostrar el formulario de edición
        // Esta es una capa adicional, ya que la ruta PATCH también lo verificará.
        if (req.user.id !== task.creatorId) {
            // Podrías también permitir a administradores editar, si tuvieras ese rol
            req.flash('error', i18next.t('flash.task.authError'));
            return reply.redirect(app.reverse('tasks'));
        }


        const statuses = await app.objection.models.taskStatus.query();
        const users = await app.objection.models.user.query();
        const allLabels = await app.objection.models.label.query();

        // Preparar los IDs de las etiquetas actuales de la tarea para el formulario
        const taskLabelIds = task.labels ? task.labels.map(l => l.id) : [];
        const taskForForm = { ...task, labels: taskLabelIds };


        return reply.render('tasks/edit', {
          task: taskForForm,
          statuses,
          users,
          labels: allLabels, // Todas las etiquetas disponibles
          currentUser: req.user,
          errors: {},
        });
      } catch (err) {
        console.error('Error al cargar formulario de edición de tarea:', err);
        req.flash('error', 'Failed to load task edit form');
        return reply.redirect(app.reverse('tasks'));
      }
    })

    // 5. Crear una tarea
    .post('/tasks', {
      name: 'createTask',
      preValidation: app.authenticate,
    }, async (req, reply) => {
      const rawFormData = req.body.data || {};

      // Preparar datos para el modelo, convirtiendo strings a números donde sea necesario
      const taskPayload = {
        name: rawFormData.name,
        description: rawFormData.description,
        // statusId y executorId pueden ser null si no se seleccionan, pero deben ser numéricos si se proporcionan.
        // El schema 'required' se encargará de 'statusId'.
        statusId: rawFormData.statusId ? Number(rawFormData.statusId) : null,
        executorId: rawFormData.executorId ? Number(rawFormData.executorId) : null,
        creatorId: req.user.id, // Siempre es el usuario autenticado
      };

      const labelIds = rawFormData.labels ? _.castArray(rawFormData.labels).map(Number) : [];

      try {
        // Validar los datos contra el jsonSchema del modelo Task
        // Objection.js lanzará un ValidationError si los datos no son válidos.
        // 'fromJson' también asigna los valores y es una buena práctica usarlo.
        // No es necesario llamar a $validate() explícitamente si usas fromJson o insert.
        // El método insertAndFetch valida automáticamente.
        // Solo necesitamos asegurar que los campos requeridos (name, statusId) estén presentes.

        // Si se usa `insertGraph`, la validación se hace automáticamente.
        // Si se hace por separado, se puede validar así:
        // await app.objection.models.task.fromJson(taskPayload); // Esto valida

        const trx = await app.objection.models.task.startTransaction();
        try {
          const newTask = await app.objection.models.task.query(trx)
            .insertAndFetch(taskPayload); // insertAndFetch valida y luego inserta

          if (labelIds.length > 0) {
            // Usar $relatedQuery para asociar etiquetas es más idiomático con Objection
            await newTask.$relatedQuery('labels', trx).relate(labelIds);
          }

          await trx.commit();
          req.flash('info', i18next.t('flash.tasks.create.success'));
          return reply.redirect(app.reverse('tasks'));

        } catch (dbOrRelationError) {
          await trx.rollback();
          // Podría ser un error de DB o un error al relacionar (ej. labelId no existe)
          console.error('Error de DB/Relación al crear tarea:', dbOrRelationError);
          // Si el error original es una ValidationError, usar sus detalles
          if (dbOrRelationError.name === 'ValidationError') {
            throw dbOrRelationError; // Re-lanzar para que lo capture el catch externo
          }
          // Si no es ValidationError, es otro tipo de error (ej. constraint violation)
          req.flash('error', i18next.t('flash.tasks.create.errorDB') || 'Database error during task creation.');
          // Re-renderizar el formulario con un error general
          const statuses = await app.objection.models.taskStatus.query();
          const users = await app.objection.models.user.query();
          const labels = await app.objection.models.label.query();
          reply.code(500); // O 422 si se considera un error de datos procesables
          return reply.render('tasks/new', {
            task: rawFormData, // Devolver los datos originales
            statuses,
            users,
            labels,
            currentUser: req.user,
            errors: { general: [{ message: i18next.t('flash.tasks.create.errorDB') || 'A database error occurred.' }] },
          });
        }
      } catch (validationError) {
        // Captura ValidationError de fromJson o de insertAndFetch
        if (validationError.name === 'ValidationError') {
          console.error('Error de validación al crear tarea (Objection):', JSON.stringify(validationError.data, null, 2));
          req.flash('error', i18next.t('flash.tasks.create.error'));

          const statuses = await app.objection.models.taskStatus.query();
          const users = await app.objection.models.user.query();
          const labels = await app.objection.models.label.query();
          
          reply.code(200); // O 422. Manteniendo 200 por consistencia con logs previos.
          return reply.render('tasks/new', {
            task: rawFormData, // Enviar de vuelta los datos originales del formulario
            statuses,
            users,
            labels,
            currentUser: req.user,
            errors: validationError.data,
          });
        }

        // Otros errores inesperados durante la preparación de datos o antes de la transacción
        console.error('Error inesperado (fuera de TX) al crear tarea:', validationError);
        req.flash('error', i18next.t('flash.common.error.unexpected'));
        reply.code(500);
        return reply.redirect(app.reverse('tasks')); // Redirigir en caso de error muy inesperado
      }
    })

    // 6. Actualizar una tarea
    .patch('/tasks/:id', {
      name: 'updateTask',
      preValidation: [app.authenticate, checkTaskCreatorOrAdmin], // Asegurar que solo el creador pueda actualizar
    }, async (req, reply) => {
      const { id } = req.params;
      const rawFormData = req.body.data || {};

      const taskPayload = {
        name: rawFormData.name,
        description: rawFormData.description,
        statusId: rawFormData.statusId ? Number(rawFormData.statusId) : null,
        executorId: rawFormData.executorId ? Number(rawFormData.executorId) : null,
        // creatorId no se actualiza
      };
      const labelIds = rawFormData.labels ? _.castArray(rawFormData.labels).map(Number) : [];

      try {
        const taskToUpdate = await app.objection.models.task.query().findById(id);
        if (!taskToUpdate) { // Debería ser capturado por checkTaskCreatorOrAdmin, pero doble check
          req.flash('error', i18next.t('flash.task.view.error'));
          return reply.redirect(app.reverse('tasks'));
        }

        // Validar los datos antes de intentar la transacción
        // (fromJson no es ideal para patch si no todos los campos vienen, pero $validate sí)
        // Alternativamente, puedes usar .patchAndFetch() que valida los campos que se están actualizando.
        // O, si tu modelo está configurado para validar en $beforeUpdate, eso es suficiente.
        // Por simplicidad, confiaremos en la validación de patchAndFetch.

        const trx = await app.objection.models.task.startTransaction();
        try {
          await app.objection.models.task.query(trx)
            .findById(id)
            .patch(taskPayload); // patch valida los campos que se están actualizando

          // Para actualizar relaciones ManyToMany, es común desvincular todas y luego vincular las nuevas.
          await taskToUpdate.$relatedQuery('labels', trx).unrelate();
          if (labelIds.length > 0) {
            await taskToUpdate.$relatedQuery('labels', trx).relate(labelIds);
          }

          await trx.commit();
          req.flash('info', i18next.t('flash.task.edit.success'));
          return reply.redirect(app.reverse('tasks'));

        } catch (dbOrRelationError) {
          await trx.rollback();
          if (dbOrRelationError.name === 'ValidationError') {
            throw dbOrRelationError; // Re-lanzar para el catch externo
          }
          console.error('Error de DB/Relación al actualizar tarea:', dbOrRelationError);
          req.flash('error', i18next.t('flash.tasks.edit.errorDB') || 'Database error during task update.');
          // Re-renderizar formulario de edición con error general
          const statuses = await app.objection.models.taskStatus.query();
          const users = await app.objection.models.user.query();
          const allLabels = await app.objection.models.label.query();
          reply.code(500); // O 422
          return reply.render('tasks/edit', {
            task: { ...rawFormData, id }, // Datos del formulario con el ID
            statuses,
            users,
            labels: allLabels,
            currentUser: req.user,
            errors: { general: [{ message: i18next.t('flash.tasks.edit.errorDB') || 'A database error occurred.' }] },
          });
        }
      } catch (validationError) {
        if (validationError.name === 'ValidationError') {
          console.error('Error de validación al actualizar tarea:', JSON.stringify(validationError.data, null, 2));
          req.flash('error', i18next.t('flash.tasks.edit.error'));
          
          const statuses = await app.objection.models.taskStatus.query();
          const users = await app.objection.models.user.query();
          const allLabels = await app.objection.models.label.query();
          
          reply.code(200); // O 422
          return reply.render('tasks/edit', {
            task: { ...rawFormData, id }, // Enviar de vuelta los datos del formulario, incluyendo el ID
            statuses,
            users,
            labels: allLabels,
            currentUser: req.user,
            errors: validationError.data,
          });
        }
        console.error('Error inesperado (fuera de TX) al actualizar tarea:', validationError);
        req.flash('error', i18next.t('flash.common.error.unexpected'));
        reply.code(500);
        return reply.redirect(app.reverse('tasks'));
      }
    })

    // 7. Eliminar una tarea
    .delete('/tasks/:id', {
      name: 'deleteTask',
      preValidation: [app.authenticate, checkTaskCreatorOrAdmin],
    }, async (req, reply) => {
      const { id } = req.params;
      try {
        // La transacción es buena aquí también para asegurar que tanto la desvinculación como la eliminación ocurran
        const trx = await app.objection.models.task.startTransaction();
        try {
          const taskToDelete = await app.objection.models.task.query(trx).findById(id);
          if (taskToDelete) { // Asegurarse de que la tarea aún existe
            await taskToDelete.$relatedQuery('labels', trx).unrelate(); // Desvincular etiquetas
            await app.objection.models.task.query(trx).deleteById(id); // Eliminar la tarea
            await trx.commit();
            req.flash('info', i18next.t('flash.task.delete.success'));
          } else {
            // Si checkTaskCreatorOrAdmin pasó pero la tarea ya no está, es un caso raro.
            await trx.rollback();
            req.flash('error', i18next.t('flash.task.view.error')); // Tarea no encontrada
          }
        } catch (err) {
          await trx.rollback();
          throw err; // Re-lanzar para el catch externo
        }
        return reply.redirect(app.reverse('tasks'));
      } catch (err) {
        console.error(`Error al eliminar tarea ${id}:`, err);
        req.flash('error', i18next.t('flash.task.delete.error'));
        return reply.redirect(app.reverse('tasks'));
      }
    })

    // Ruta para simular DELETE vía POST (si tus formularios no pueden hacer DELETE directamente)
    // Esta ruta es delicada si tienes PATCH /tasks/:id también vía POST con _method.
    // Asegúrate de que el middleware checkTaskCreatorOrAdmin se aplique aquí también.
    .post('/tasks/:id', {
      name: 'postHandleTaskActions', // Renombrar para evitar confusión, esta ruta podría manejar más acciones
      preValidation: [app.authenticate], // La autorización específica se hará dentro
    }, async (req, reply) => {
      // eslint-disable-next-line no-underscore-dangle
      if (req.body && req.body._method === 'DELETE') {
        // Llamar a la lógica de la ruta DELETE o duplicarla con la verificación de propietario
        const { id } = req.params;
        const task = await app.objection.models.task.query().findById(id);

        if (!task) {
          req.flash('error', i18next.t('flash.task.view.error'));
          return reply.redirect(app.reverse('tasks'));
        }
        if (req.user.id !== task.creatorId) {
          req.flash('error', i18next.t('flash.task.authError'));
          return reply.redirect(app.reverse('tasks'));
        }
        // Si todo OK, proceder con la eliminación (copiando lógica de la ruta DELETE)
        try {
          const trx = await app.objection.models.task.startTransaction();
          try {
            await task.$relatedQuery('labels', trx).unrelate();
            await app.objection.models.task.query(trx).deleteById(id);
            await trx.commit();
            req.flash('info', i18next.t('flash.task.delete.success'));
          } catch (err) {
            await trx.rollback();
            throw err;
          }
          return reply.redirect(app.reverse('tasks'));
        } catch (err) {
          console.error(`Error al eliminar tarea ${id} (vía POST):`, err);
          req.flash('error', i18next.t('flash.task.delete.error'));
          return reply.redirect(app.reverse('tasks'));
        }
      } else if (req.body && req.body._method === 'PATCH') {
          // Redirigir a la lógica de la ruta PATCH o manejarla aquí
          // Esto requeriría mover la lógica de .patch('/tasks/:id', ...) a una función
          // y llamarla desde aquí y desde la ruta PATCH. Por ahora, esto es solo un marcador.
          // Por simplicidad, asumimos que los formularios PATCH usan el método PATCH directamente.
          return reply.code(501).send('PATCH via POST not fully implemented here, use direct PATCH method.');
      }
      // Si no es DELETE ni PATCH simulado, es un mal request a esta ruta POST con ID.
      return reply.code(400).send({ error: 'Invalid action for POST /tasks/:id' });
    });

  // Importante: Si tu `app` es una instancia de Fastify que se pasa
  // y las rutas se registran en ella, no necesitas devolver `app`.
  // Si es un router de Express, sí lo devolverías.
  // Asumo que es Fastify por los logs.
};