// server/routes/tasks.js
// @ts-check

import i18next from 'i18next';
import _ from 'lodash';

export default (app) => {
  // Middleware para verificar que solo el creador pueda acceder a ciertas acciones de tarea
  // (Se usa directamente en las rutas donde se necesita)

  app
    // 1. Lista de tareas
    .get('/tasks', { name: 'tasks' }, async (req, reply) => {
      try {
        const filter = {};
        // Convertir a números y usar los nombres de campo correctos del modelo
        if (req.query.status && req.query.status !== '') {
          filter.statusId = Number(req.query.status);
        }
        if (req.query.executor && req.query.executor !== '') {
          filter.executorId = Number(req.query.executor);
        }
        if (req.query.label && req.query.label !== '') {
          filter.labelId = Number(req.query.label);
        }
        // 'isCreatorUser' se aplica si el checkbox está 'on' y hay un usuario logueado
        if (req.query.isCreatorUser === 'on' && req.user) {
          filter.creatorId = req.user.id;
        }

        const statuses = await app.objection.models.taskStatus.query();
        const users = await app.objection.models.user.query();
        const labels = await app.objection.models.label.query();

        let query = app.objection.models.task.query()
          .withGraphJoined('[status, creator, executor, labels]')
          .orderBy('tasks.createdAt', 'desc');

        // Aplicar filtros
        if (filter.statusId) {
          query = query.where('tasks.statusId', filter.statusId);
        }
        if (filter.executorId) {
          query = query.where('tasks.executorId', filter.executorId);
        }
        if (filter.creatorId) {
          query = query.where('tasks.creatorId', filter.creatorId);
        }
        if (filter.labelId) {
          // Para filtrar por etiqueta en una relación many-to-many
          query = query.whereExists(
            app.objection.models.task.relatedQuery('labels').where('labels.id', filter.labelId),
          );
        }

        const tasks = await query;

        return reply.render('tasks/index', {
          tasks,
          statuses,
          users,
          labels,
          filterParams: req.query, // Para rellenar el formulario de filtro
          currentUser: req.user,
        });
      } catch (err) {
        console.error('Error al obtener tareas:', err);
        req.flash('error', i18next.t('flash.common.error.loadFailed', { resource: 'tasks' }) || 'Failed to load tasks.');
        return reply.redirect(app.reverse('root'));
      }
    })

    // 2. Formulario para crear una tarea
    .get('/tasks/new', {
      name: 'newTask',
      preValidation: app.authenticate, // Solo usuarios autenticados
    }, async (req, reply) => {
      try {
        const task = new app.objection.models.task(); // Nueva instancia para el form
        const statuses = await app.objection.models.taskStatus.query();
        const users = await app.objection.models.user.query();
        const labels = await app.objection.models.label.query();

        return reply.render('tasks/new', {
          task, // Pasar la instancia vacía
          statuses,
          users,
          labels,
          currentUser: req.user,
          errors: {}, // Objeto de errores vacío por defecto
        });
      } catch (err) {
        console.error('Error al cargar formulario de nueva tarea:', err);
        req.flash('error', i18next.t('flash.common.error.loadFailed', { resource: 'task form' }) || 'Failed to load task form.');
        return reply.redirect(app.reverse('tasks'));
      }
    })

    // 3. Ver detalles de una tarea
    .get('/tasks/:id', {
      name: 'showTask',
      preValidation: app.authenticate, // Solo usuarios autenticados
    }, async (req, reply) => {
      try {
        const { id } = req.params;
        const task = await app.objection.models.task.query()
          .findById(id)
          .withGraphJoined('[status, creator, executor, labels]');

        if (!task) {
          req.flash('error', i18next.t('flash.task.view.errorNotFound') || 'Task not found.');
          return reply.redirect(app.reverse('tasks'));
        }

        return reply.render('tasks/show', {
          task,
          currentUser: req.user,
        });
      } catch (err) {
        console.error('Error al ver detalles de tarea:', err);
        req.flash('error', i18next.t('flash.common.error.unexpected') || 'Failed to view task details.');
        return reply.redirect(app.reverse('tasks'));
      }
    })

    // 4. Formulario para editar una tarea
    .get('/tasks/:id/edit', {
      name: 'editTask',
      preValidation: app.authenticate,
    }, async (req, reply) => {
      try {
        const { id } = req.params;
        const task = await app.objection.models.task.query()
          .findById(id)
          .withGraphFetched('labels'); // Cargar etiquetas asociadas

        if (!task) {
          req.flash('error', i18next.t('flash.task.view.errorNotFound') || 'Task not found.');
          return reply.redirect(app.reverse('tasks'));
        }

        // Autorización: Solo el creador puede ver el formulario de edición
        if (req.user.id !== task.creatorId) {
          req.flash('error', i18next.t('flash.task.authError') || 'You are not authorized to edit this task.');
          return reply.redirect(app.reverse('tasks'));
        }

        const statuses = await app.objection.models.taskStatus.query();
        const users = await app.objection.models.user.query();
        const allLabels = await app.objection.models.label.query();

        // Preparar los IDs de las etiquetas actuales de la tarea para el formulario
        const taskDataForForm = {
          ...task,
          labels: task.labels ? task.labels.map(l => l.id) : [],
        };

        return reply.render('tasks/edit', {
          task: taskDataForForm,
          statuses,
          users,
          labels: allLabels,
          currentUser: req.user,
          errors: {},
        });
      } catch (err) {
        console.error('Error al cargar formulario de edición de tarea:', err);
        req.flash('error', i18next.t('flash.common.error.loadFailed', { resource: 'task edit form' }) || 'Failed to load task edit form.');
        return reply.redirect(app.reverse('tasks'));
      }
    })

    // 5. Crear una tarea
    .post('/tasks', {
      name: 'createTask', // Nombre de la ruta para app.reverse
      preValidation: app.authenticate,
    }, async (req, reply) => {
      const rawFormData = req.body.data || {};

      const taskPayload = {
        name: rawFormData.name,
        description: rawFormData.description,
        statusId: rawFormData.statusId ? Number(rawFormData.statusId) : null,
        executorId: rawFormData.executorId ? Number(rawFormData.executorId) : null,
        creatorId: req.user.id,
      };
      const labelIds = rawFormData.labels ? _.castArray(rawFormData.labels).map(Number).filter(id => !Number.isNaN(id)) : [];


      try {
        // La validación de `taskPayload` la hará `insertAndFetch` contra el jsonSchema.
        const trx = await app.objection.models.task.startTransaction();
        try {
          const newTask = await app.objection.models.task.query(trx)
            .insertAndFetch(taskPayload);

          if (labelIds.length > 0) {
            for (const labelId of labelIds) {
              // Podrías añadir una verificación aquí si el labelId existe,
              // o dejar que la BD falle si hay una FK constraint.
              await newTask.$relatedQuery('labels', trx).relate(labelId).catch(err => {
                // Manejar el caso donde un labelId podría no ser válido o causar error
                console.warn(`Could not relate labelId ${labelId} to task ${newTask.id}: ${err.message}`);
                // Decide si esto debe ser un error fatal para la transacción
              });
            }
          }

          await trx.commit();
          req.flash('info', i18next.t('flash.tasks.create.success')); // El test espera "Tarea creada con éxito"
          return reply.redirect(app.reverse('tasks'));

        } catch (dbOrRelationError) {
          await trx.rollback();
          console.error('Error de DB/Relación al crear tarea:', dbOrRelationError);

          // Si el error es una ValidationError (ej. de $relatedQuery o un hook), trátalo como tal
          if (dbOrRelationError.name === 'ValidationError') {
            throw dbOrRelationError; // Re-lanzar para el catch de validación principal
          }
          // De lo contrario, es un error de DB o de otro tipo
          req.flash('error', i18next.t('flash.tasks.create.errorDB', { message: dbOrRelationError.message }) || 'Database error during task creation.');
          const statuses = await app.objection.models.taskStatus.query();
          const users = await app.objection.models.user.query();
          const labels = await app.objection.models.label.query();
          reply.code(500); // Error del servidor
          return reply.render('tasks/new', {
            task: rawFormData,
            statuses,
            users,
            labels,
            currentUser: req.user,
            errors: { general: [{ message: i18next.t('flash.tasks.create.errorDB') || 'A database error occurred.' }] },
          });
        }
      } catch (validationError) {
        // Captura ValidationError de insertAndFetch o re-lanzado desde el catch interno
        if (validationError.name === 'ValidationError') {
          console.error('Error de validación al crear tarea (Objection):', JSON.stringify(validationError.data, null, 2));
          req.flash('error', i18next.t('flash.tasks.create.error'));

          const statuses = await app.objection.models.taskStatus.query();
          const users = await app.objection.models.user.query();
          const labels = await app.objection.models.label.query();
          
          reply.code(200); // O 422. Si el test de validación espera 200.
          return reply.render('tasks/new', {
            task: rawFormData, // Enviar de vuelta los datos originales del formulario
            statuses,
            users,
            labels,
            currentUser: req.user,
            errors: validationError.data, // Objeto de errores de Objection
          });
        }

        // Otros errores inesperados
        console.error('Error inesperado (fuera de TX) al crear tarea:', validationError);
        req.flash('error', i18next.t('flash.common.error.unexpected'));
        reply.code(500);
        return reply.redirect(app.reverse('tasks'));
      }
    })

    // 6. Actualizar una tarea
    .patch('/tasks/:id', {
      name: 'updateTask',
      preValidation: app.authenticate,
    }, async (req, reply) => {
      const { id } = req.params;
      const rawFormData = req.body.data || {};

      const taskToUpdate = await app.objection.models.task.query().findById(id);
      if (!taskToUpdate) {
        req.flash('error', i18next.t('flash.task.view.errorNotFound') || 'Task not found.');
        return reply.redirect(app.reverse('tasks'));
      }
      // Autorización: Solo el creador puede actualizar
      if (req.user.id !== taskToUpdate.creatorId) {
        req.flash('error', i18next.t('flash.task.authError') || 'You are not authorized to update this task.');
        return reply.redirect(app.reverse('tasks'));
      }

      const taskPayload = {
        name: rawFormData.name,
        description: rawFormData.description,
        statusId: rawFormData.statusId ? Number(rawFormData.statusId) : taskToUpdate.statusId, // Mantener si no se envía
        executorId: rawFormData.executorId !== undefined ? (rawFormData.executorId ? Number(rawFormData.executorId) : null) : taskToUpdate.executorId,
      };
      const labelIds = rawFormData.labels ? _.castArray(rawFormData.labels).map(Number).filter(id => !Number.isNaN(id)) : [];

      try {
        // La validación de los campos en taskPayload la hará `patch`
        const trx = await app.objection.models.task.startTransaction();
        try {
          await app.objection.models.task.query(trx)
            .findById(id)
            .patch(taskPayload);

          // Actualizar etiquetas: desvincular todas y luego vincular las nuevas seleccionadas
          await taskToUpdate.$relatedQuery('labels', trx).unrelate();
          if (labelIds.length > 0) {
            for (const labelId of labelIds) {
              await taskToUpdate.$relatedQuery('labels', trx).relate(labelId).catch(err => {
                  console.warn(`Could not relate labelId ${labelId} to task ${id} during update: ${err.message}`);
              });
            }
          }

          await trx.commit();
          req.flash('info', i18next.t('flash.task.edit.success'));
          return reply.redirect(app.reverse('tasks'));

        } catch (dbOrRelationError) {
          await trx.rollback();
          console.error('Error de DB/Relación al actualizar tarea:', dbOrRelationError);
          if (dbOrRelationError.name === 'ValidationError') {
            throw dbOrRelationError;
          }
          req.flash('error', i18next.t('flash.tasks.edit.errorDB', { message: dbOrRelationError.message }) || 'Database error during task update.');
          
          const statuses = await app.objection.models.taskStatus.query();
          const users = await app.objection.models.user.query();
          const allLabels = await app.objection.models.label.query();
          reply.code(500);
          return reply.render('tasks/edit', {
            task: { ...taskToUpdate, ...rawFormData, id, labels: labelIds }, // Fusionar para repoblar
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
            task: { ...taskToUpdate, ...rawFormData, id, labels: labelIds }, // Fusionar para repoblar
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
      preValidation: app.authenticate,
    }, async (req, reply) => {
      const { id } = req.params;
      const task = await app.objection.models.task.query().findById(id);

      if (!task) {
        req.flash('error', i18next.t('flash.task.view.errorNotFound') || 'Task not found.');
        return reply.redirect(app.reverse('tasks'));
      }
      // Autorización: Solo el creador puede eliminar
      if (req.user.id !== task.creatorId) {
        req.flash('error', i18next.t('flash.task.authError') || 'You are not authorized to delete this task.');
        return reply.redirect(app.reverse('tasks'));
      }

      try {
        const trx = await app.objection.models.task.startTransaction();
        try {
          await task.$relatedQuery('labels', trx).unrelate(); // Desvincular etiquetas
          await app.objection.models.task.query(trx).deleteById(id); // Eliminar la tarea
          await trx.commit();
          req.flash('info', i18next.t('flash.task.delete.success'));
        } catch (err) {
          await trx.rollback();
          throw err;
        }
        return reply.redirect(app.reverse('tasks'));
      } catch (err) {
        console.error(`Error al eliminar tarea ${id}:`, err);
        req.flash('error', i18next.t('flash.task.delete.errorDB', { message: err.message }) || 'Error deleting task.');
        return reply.redirect(app.reverse('tasks'));
      }
    })

    // Ruta para simular acciones como DELETE vía POST (si es necesario)
    .post('/tasks/:id', {
      name: 'postHandleTaskActions',
      preValidation: app.authenticate,
    }, async (req, reply) => {
      const { id } = req.params;
      // eslint-disable-next-line no-underscore-dangle
      if (req.body && req.body._method === 'DELETE') {
        const task = await app.objection.models.task.query().findById(id);
        if (!task) {
          req.flash('error', i18next.t('flash.task.view.errorNotFound') || 'Task not found.');
          return reply.redirect(app.reverse('tasks'));
        }
        if (req.user.id !== task.creatorId) {
          req.flash('error', i18next.t('flash.task.authError') || 'You are not authorized to delete this task.');
          return reply.redirect(app.reverse('tasks'));
        }
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
          req.flash('error', i18next.t('flash.task.delete.errorDB', { message: err.message }) || 'Error deleting task.');
          return reply.redirect(app.reverse('tasks'));
        }
      }
      // Si no es un método simulado conocido, es un error
      return reply.code(400).send({ error: 'Invalid action for POST /tasks/:id' });
    });
};