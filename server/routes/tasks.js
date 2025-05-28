// server/routes/tasks.js
// @ts-check

import i18next from 'i18next';
import _ from 'lodash';

export default (app) => {
  app
    // 1. Lista de tareas
    .get('/tasks', { name: 'tasks' }, async (req, reply) => {
      try {
        const filter = {};
        if (req.query.status && req.query.status !== '') {
          filter.statusId = Number(req.query.status);
        }
        if (req.query.executor && req.query.executor !== '') {
          filter.executorId = Number(req.query.executor);
        }
        if (req.query.label && req.query.label !== '') {
          filter.labelId = Number(req.query.label);
        }
        if (req.query.isCreatorUser === 'on' && req.user) {
          filter.creatorId = req.user.id;
        }

        const statuses = await app.objection.models.taskStatus.query();
        const users = await app.objection.models.user.query();
        const labels = await app.objection.models.label.query();

        let query = app.objection.models.task.query()
          .withGraphJoined('[status, creator, executor, labels]')
          .orderBy('tasks.createdAt', 'desc');

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
          filterParams: req.query,
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
      preValidation: app.authenticate,
    }, async (req, reply) => {
      try {
        const task = new app.objection.models.task();
        const statuses = await app.objection.models.taskStatus.query();
        const users = await app.objection.models.user.query();
        const labels = await app.objection.models.label.query();

        return reply.render('tasks/new', {
          task,
          statuses,
          users,
          labels,
          currentUser: req.user,
          errors: {},
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
      preValidation: app.authenticate,
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
          .withGraphFetched('labels');

        if (!task) {
          req.flash('error', i18next.t('flash.task.view.errorNotFound') || 'Task not found.');
          return reply.redirect(app.reverse('tasks'));
        }

        if (req.user.id !== task.creatorId) {
          req.flash('error', i18next.t('flash.task.authError') || 'You are not authorized to edit this task.');
          return reply.redirect(app.reverse('tasks'));
        }

        const statuses = await app.objection.models.taskStatus.query();
        const users = await app.objection.models.user.query();
        const allLabels = await app.objection.models.label.query();
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
      name: 'createTask',
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
        const trx = await app.objection.models.task.startTransaction();
        try {
          const newTask = await app.objection.models.task.query(trx)
            .insertAndFetch(taskPayload);

          if (labelIds.length > 0) {
            for (const labelId of labelIds) {
              await newTask.$relatedQuery('labels', trx).relate(labelId).catch(err => {
                console.warn(`Could not relate labelId ${labelId} to task ${newTask.id}: ${err.message}`);
              });
            }
          }

          await trx.commit();
          req.flash('info', i18next.t('flash.tasks.create.success'));
          return reply.redirect(app.reverse('tasks'));

        } catch (dbOrRelationError) {
          await trx.rollback();
          console.error('Error de DB/Relación al crear tarea:', dbOrRelationError);
          if (dbOrRelationError.name === 'ValidationError') {
            throw dbOrRelationError;
          }
          req.flash('error', i18next.t('flash.tasks.create.errorDB', { message: dbOrRelationError.message }) || 'Database error during task creation.');
          const statuses = await app.objection.models.taskStatus.query();
          const users = await app.objection.models.user.query();
          const labels = await app.objection.models.label.query();
          reply.code(500);
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
        if (validationError.name === 'ValidationError') {
          console.error('Error de validación al crear tarea (Objection):', JSON.stringify(validationError.data, null, 2));
          req.flash('error', i18next.t('flash.tasks.create.error'));

          const statuses = await app.objection.models.taskStatus.query();
          const users = await app.objection.models.user.query();
          const labels = await app.objection.models.label.query();
          
          reply.code(200);
          return reply.render('tasks/new', {
            task: rawFormData,
            statuses,
            users,
            labels,
            currentUser: req.user,
            errors: validationError.data,
          });
        }
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
      if (req.user.id !== taskToUpdate.creatorId) {
        req.flash('error', i18next.t('flash.task.authError') || 'You are not authorized to update this task.');
        return reply.redirect(app.reverse('tasks'));
      }

      const taskPayload = {
        name: rawFormData.name,
        description: rawFormData.description,
        statusId: rawFormData.statusId ? Number(rawFormData.statusId) : taskToUpdate.statusId,
        executorId: rawFormData.executorId !== undefined ? (rawFormData.executorId ? Number(rawFormData.executorId) : null) : taskToUpdate.executorId,
      };
      const labelIds = rawFormData.labels ? _.castArray(rawFormData.labels).map(Number).filter(id => !Number.isNaN(id)) : [];

      try {
        const trx = await app.objection.models.task.startTransaction();
        try {
          await app.objection.models.task.query(trx)
            .findById(id)
            .patch(taskPayload);

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
            task: { ...taskToUpdate, ...rawFormData, id, labels: labelIds },
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
          
          reply.code(200);
          return reply.render('tasks/edit', {
            task: { ...taskToUpdate, ...rawFormData, id, labels: labelIds },
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
        console.error(`Error al eliminar tarea ${id}:`, err);
        req.flash('error', i18next.t('flash.task.delete.errorDB', { message: err.message }) || 'Error deleting task.');
        return reply.redirect(app.reverse('tasks'));
      }
    })

    // Ruta para simular acciones como DELETE vía POST
    .post('/tasks/:id', {
      name: 'postDeleteTask', // *** CAMBIO AQUÍ: Nombre de ruta corregido ***
      preValidation: [app.authenticate],
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
      return reply.code(400).send({ error: 'Invalid action for POST /tasks/:id' });
    });
};