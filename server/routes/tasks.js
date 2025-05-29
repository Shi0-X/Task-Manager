// server/routes/tasks.js
// @ts-check

import i18next from 'i18next';
import _ from 'lodash';

export default (app) => {
  // Middleware para verificar que solo el creador pueda eliminar la tarea
  const checkTaskOwnership = async (req, reply) => {
    const { id } = req.params;
    const task = await app.objection.models.task.query().findById(id);

    // Si la tarea no existe, redirigir
    if (!task) {
      req.flash('error', i18next.t('flash.task.view.error'));
      return reply.redirect(app.reverse('tasks'));
    }

    // Si el usuario actual no es el creador, no permitir la eliminación
    if (req.user.id !== task.creatorId) {
      req.flash('error', i18next.t('flash.task.delete.error'));
      return reply.redirect(app.reverse('tasks'));
    }

    return true;
  };

  app
    // 1. Lista de tareas
    .get('/tasks', { name: 'tasks' }, async (req, reply) => {
      try {
        // Obtener los parámetros de filtro - solo los que el usuario ha seleccionado explícitamente
        const filter = {};

        // Solo agregar al filtro los parámetros que tienen un valor
        if (req.query.status && req.query.status !== '') {
          filter.status = req.query.status;
        }

        if (req.query.executor && req.query.executor !== '') {
          filter.executor = req.query.executor;
        }

        if (req.query.label && req.query.label !== '') {
          filter.label = req.query.label;
        }

        if (req.query.isCreatorUser === 'on') {
          filter.isCreatorUser = req.query.isCreatorUser;
        }

        // Obtener usuarios, estados y etiquetas para el formulario
        const statuses = await app.objection.models.taskStatus.query();
        const users = await app.objection.models.user.query();
        const labels = await app.objection.models.label.query();

        // Construir la consulta base
        let query = app.objection.models.task.query()
          .withGraphJoined('[status, creator, executor, labels]');

        // Aplicar solo los filtros que el usuario seleccionó explícitamente
        if (filter.status) {
          query = query.where('tasks.statusId', Number(filter.status));
        }

        if (filter.executor) {
          query = query.where('tasks.executorId', Number(filter.executor));
        }

        if (filter.label) {
          const labelId = Number(filter.label);
          query = query
            .whereExists(
              app.objection.models.task.relatedQuery('labels')
                .where('labels.id', labelId),
            );
        }

        if (filter.isCreatorUser === 'on' && req.user) {
          query = query.where('tasks.creatorId', req.user.id);
        }

        // Ejecutar la consulta
        const tasks = await query;

        return reply.render('tasks/index', {
          tasks,
          statuses,
          users,
          labels,
          filter, // Pasamos solo los filtros explícitamente seleccionados
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
          errors: {}, // Agregar errors vacío por defecto
        });
      } catch (err) {
        console.error('Error al cargar formulario de nueva tarea:', err);
        req.flash('error', 'Failed to load task form');
        return reply.redirect(app.reverse('tasks'));
      }
    })

    // 3. Ver detalles de una tarea
    .get('/tasks/:id', {
      name: 'showTask',
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
      preValidation: app.authenticate,
    }, async (req, reply) => {
      try {
        const { id } = req.params;
        const task = await app.objection.models.task.query()
          .findById(id)
          .withGraphJoined('labels');

        if (!task) {
          req.flash('error', i18next.t('flash.task.view.error'));
          return reply.redirect(app.reverse('tasks'));
        }

        const statuses = await app.objection.models.taskStatus.query();
        const users = await app.objection.models.user.query();
        const labels = await app.objection.models.label.query();

        return reply.render('tasks/edit', {
          task,
          statuses,
          users,
          labels,
          currentUser: req.user,
          errors: {}, // Agregar errors vacío por defecto
        });
      } catch (err) {
        console.error('Error al cargar formulario de edición:', err);
        req.flash('error', 'Failed to load edit form');
        return reply.redirect(app.reverse('tasks'));
      }
    })

    // 5. Crear una tarea
    .post('/tasks', {
      name: 'createTask',
      preValidation: app.authenticate,
    }, async (req, reply) => {
      console.log('=== INICIO DE CREACIÓN DE TAREA ===');
      console.log('Método:', req.method);
      console.log('URL:', req.url);
      console.log('Headers:', req.headers);
      console.log('Cuerpo completo de la solicitud:', JSON.stringify(req.body, null, 2));
      console.log('Datos del formulario:', req.body.data);
      
      // Obtener datos del formulario - IMPORTANTE: manejar cuando es undefined
      const data = req.body.data || {};
      
      // Crear un objeto de errores vacío
      const errors = {};
      
      // Validar campo name ANTES de hacer cualquier otra cosa
      console.log('Validando campo name:', data.name);
      if (!data.name || String(data.name).trim() === '') {
        errors.name = [{ message: 'must NOT have fewer than 1 characters' }];
        console.log('Error en name: campo vacío');
      }
      
      // Validar campo statusId ANTES de hacer cualquier otra cosa
      console.log('Validando campo statusId:', data.statusId);
      if (!data.statusId || data.statusId === '' || data.statusId === null || data.statusId === undefined) {
        errors.statusId = [{ message: 'must be integer' }];
        console.log('Error en statusId: campo vacío');
      }
      
      // Si hay errores de validación, renderizar la vista con los errores
      if (Object.keys(errors).length > 0) {
        console.log('=== ERRORES DE VALIDACIÓN ENCONTRADOS ===');
        console.log('Errores:', JSON.stringify(errors, null, 2));
        console.log('Cantidad de errores:', Object.keys(errors).length);
        
        // Obtener datos necesarios para renderizar la vista
        const statuses = await app.objection.models.taskStatus.query();
        const users = await app.objection.models.user.query();
        const labels = await app.objection.models.label.query();
        
        // IMPORTANTE: Agregar el flash message que espera el test
        req.flash('error', i18next.t('flash.task.create.error'));
        
        console.log('Renderizando vista con errores de validación');
        
        // Renderizar la vista con los errores
        return reply.render('tasks/new', {
          task: data, // Pasar los datos del formulario
          statuses,
          users,
          labels,
          currentUser: req.user,
          errors, // Pasar los errores de validación
        });
      }
      
      // Si llegamos aquí, no hay errores de validación manual
      // Continuamos con la creación normal de la tarea
      try {
        const task = new app.objection.models.task();
        
        // Extraer los IDs de etiquetas del formulario
        const labelIds = data.labels
          ? _.castArray(data.labels).map(Number)
          : [];

        // Eliminar labels del objeto data para la creación de la tarea
        const { labels, ...taskData } = data;

        // Convertir strings a números para los campos que lo requieren
        if (taskData.statusId) {
          taskData.statusId = Number(taskData.statusId);
        }
        if (taskData.executorId) {
          taskData.executorId = taskData.executorId ? Number(taskData.executorId) : null;
        }

        // Configurar la tarea con los datos
        task.$set({ ...taskData, creatorId: req.user.id });
        
        console.log('Objeto task antes de validar:', task);
        
        // Validar el modelo
        await task.$validate();
        console.log('Validación exitosa');

        const trx = await app.objection.models.task.startTransaction();

        try {
          const validTask = await app.objection.models.task.query(trx).insert(task);
          console.log('Tarea creada exitosamente:', validTask);

          // Asociar etiquetas a la tarea
          if (labelIds.length > 0) {
            const labelRelations = labelIds.map((labelId) => ({
              task_id: validTask.id,
              label_id: labelId,
            }));

            await trx('tasks_labels').insert(labelRelations);
            console.log('Etiquetas asociadas exitosamente');
          }

          await trx.commit();

          req.flash('info', i18next.t('flash.task.create.success'));
          return reply.redirect(app.reverse('tasks'));
        } catch (err) {
          await trx.rollback();
          throw err;
        }
      } catch (err) {
        console.error('Error al crear tarea:', err);
        console.error('Detalles del error:', err.data);
        
        req.flash('error', i18next.t('flash.task.create.error'));

        // Obtener datos necesarios para renderizar la vista
        const statuses = await app.objection.models.taskStatus.query();
        const users = await app.objection.models.user.query();
        const labels = await app.objection.models.label.query();

        console.log('Renderizando vista con errores:', err.data);

        return reply.render('tasks/new', {
          task: req.body.data || {}, // Usar los datos del formulario
          statuses,
          users,
          labels,
          currentUser: req.user,
          errors: err.data || {},
        });
      }
    })

    // 6. Actualizar una tarea
    .patch('/tasks/:id', {
      name: 'updateTask',
      preValidation: app.authenticate,
    }, async (req, reply) => {
      try {
        const { id } = req.params;
        const task = await app.objection.models.task.query().findById(id);

        if (!task) {
          req.flash('error', i18next.t('flash.task.edit.error'));
          return reply.redirect(app.reverse('tasks'));
        }

        const trx = await app.objection.models.task.startTransaction();

        try {
          // Extraer los IDs de etiquetas del formulario
          const labelIds = req.body.data.labels
            ? _.castArray(req.body.data.labels).map(Number)
            : [];

          // Eliminar labels del objeto data para la actualización de la tarea
          const { labels, ...taskData } = req.body.data;

          // Convertir IDs a números
          if (taskData.statusId) {
            taskData.statusId = Number(taskData.statusId);
          }
          if (taskData.executorId) {
            taskData.executorId = taskData.executorId ? Number(taskData.executorId) : null;
          }

          // Actualizar la tarea
          await task.$query(trx).patch(taskData);

          // Eliminar todas las relaciones existentes con etiquetas
          await trx('tasks_labels').where('task_id', id).delete();

          // Crear nuevas relaciones con etiquetas
          if (labelIds.length > 0) {
            const labelRelations = labelIds.map((labelId) => ({
              task_id: id,
              label_id: labelId,
            }));

            await trx('tasks_labels').insert(labelRelations);
          }

          await trx.commit();

          req.flash('info', i18next.t('flash.task.edit.success'));
          return reply.redirect(app.reverse('tasks'));
        } catch (err) {
          await trx.rollback();
          throw err;
        }
      } catch (err) {
        console.error('Error al actualizar tarea:', err);
        req.flash('error', i18next.t('flash.task.edit.error'));

        const statuses = await app.objection.models.taskStatus.query();
        const users = await app.objection.models.user.query();
        const labels = await app.objection.models.label.query();
        const taskWithLabels = await app.objection.models.task.query()
          .findById(req.params.id)
          .withGraphJoined('labels');

        return reply.render('tasks/edit', {
          task: { ...taskWithLabels, ...req.body.data },
          statuses,
          users,
          labels,
          currentUser: req.user,
          errors: err.data || {},
        });
      }
    })

    // 7. Eliminar una tarea
    .delete('/tasks/:id', {
      name: 'deleteTask',
      preValidation: [app.authenticate, checkTaskOwnership],
    }, async (req, reply) => {
      try {
        const { id } = req.params;
        console.log(`Eliminando tarea con ID ${id}`);

        const trx = await app.objection.models.task.startTransaction();

        try {
          // Eliminar las relaciones con etiquetas primero
          await trx('tasks_labels').where('task_id', id).delete();

          // Eliminar la tarea
          await app.objection.models.task.query(trx).deleteById(id);

          await trx.commit();

          req.flash('info', i18next.t('flash.task.delete.success'));
          return reply.redirect(app.reverse('tasks'));
        } catch (err) {
          await trx.rollback();
          throw err;
        }
      } catch (err) {
        console.error('Error al eliminar tarea:', err);
        req.flash('error', i18next.t('flash.task.delete.error'));
        return reply.redirect(app.reverse('tasks'));
      }
    })

    // Añadir ruta POST adicional para manejar DELETE
    .post('/tasks/:id', {
      name: 'postDeleteTask',
      preValidation: [app.authenticate],
    }, async (req, reply) => {
      // Esta ruta manejará los formularios que hacen POST en lugar de DELETE
      // eslint-disable-next-line no-underscore-dangle
      if (req.body && req.body._method === 'DELETE') {
        try {
          const { id } = req.params;

          // Verificar manualmente si el usuario es el propietario
          const task = await app.objection.models.task.query().findById(id);

          if (!task) {
            req.flash('error', i18next.t('flash.task.view.error'));
            return reply.redirect(app.reverse('tasks'));
          }

          // Verificar explícitamente que el usuario sea el creador
          if (req.user.id !== task.creatorId) {
            req.flash('error', i18next.t('flash.task.delete.error'));
            return reply.redirect(app.reverse('tasks'));
          }

          console.log(`Eliminando tarea con ID ${id} (método POST)`);

          const trx = await app.objection.models.task.startTransaction();

          try {
            // Eliminar las relaciones con etiquetas primero
            await trx('tasks_labels').where('task_id', id).delete();

            // Eliminar la tarea
            await app.objection.models.task.query(trx).deleteById(id);

            await trx.commit();

            req.flash('info', i18next.t('flash.task.delete.success'));
            return reply.redirect(app.reverse('tasks'));
          } catch (err) {
            await trx.rollback();
            throw err;
          }
        } catch (err) {
          console.error('Error al eliminar tarea:', err);
          req.flash('error', i18next.t('flash.task.delete.error'));
          return reply.redirect(app.reverse('tasks'));
        }
      }
      // No es una solicitud de eliminación, rechazar
      return reply.code(400).send({ error: 'Bad Request' });
    });
};