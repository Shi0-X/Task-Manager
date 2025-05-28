// server/routes/tasks.js
// @ts-check

import i18next from 'i18next';
import _ from 'lodash';

// Asegúrate de que esta utilidad exista y funcione como se espera
// Probablemente convierte varios formatos de entrada de un select múltiple a un array de números.
import normalizeMultiSelect from '../lib/normalizeMultiSelect.js'; // Verifica la ruta

export default (app) => {
  app
    // 1. Lista de tareas
    .get('/tasks', { name: 'tasks', preValidation: app.authenticate }, async (req, reply) => {
      const rawFilterParams = req.query;
      console.log('GET /tasks - Query params recibidos:', JSON.stringify(rawFilterParams, null, 2));

      const tasksQuery = app.objection.models.task.query()
        .withGraphJoined('[status, creator, executor, labels]')
        .modify('sortByLatestCreatedDate'); // Asume que este modificador existe

      // Aplicar filtros usando modificadores del modelo
      // Los modificadores deben manejar la conversión a Number y verificar si el valor es válido/no vacío
      if (rawFilterParams.status) {
        tasksQuery.modify('filterByStatus', rawFilterParams.status);
      }
      if (rawFilterParams.executor) {
        tasksQuery.modify('filterByExecutor', rawFilterParams.executor);
      }
      if (rawFilterParams.isCreatorUser === 'on' && req.user) {
        tasksQuery.modify('filterByCreator', req.user.id);
      }
      if (rawFilterParams.label) {
        tasksQuery.modify('filterByLabel', rawFilterParams.label);
      }
      
      console.log('GET /tasks - Objeto de filtro (implícito por modificadores) basado en:', JSON.stringify(rawFilterParams, null, 2));

      try {
        const [statuses, users, labels, tasks] = await Promise.all([
          app.objection.models.taskStatus.query(),
          app.objection.models.user.query(),
          app.objection.models.label.query(),
          tasksQuery, // Ejecutar la consulta de tareas ya construida
        ]);

        console.log('GET /tasks - Tareas devueltas por la consulta:', tasks.map(t => ({
          id: t.id, name: t.name, statusId: t.statusId, executorId: t.executorId, creatorId: t.creatorId,
          labelIds: t.labels ? t.labels.map(l => l.id) : [],
        })));

        reply.render('tasks/index', {
          tasks, statuses, users, labels, filterConditions: rawFilterParams, // Pasar params originales para el form
        });
      } catch (err) {
        console.error('Error al obtener tareas o datos relacionados:', err);
        if (err.stack) console.error(err.stack);
        req.flash('error', i18next.t('flash.common.error.loadFailed', { resource: 'tasks' }));
        reply.redirect(app.reverse('root'));
      }
      return reply; // Fastify maneja el envío de la respuesta
    })

    // 2. Formulario para crear una nueva tarea
    .get('/tasks/new', { name: 'newTask', preValidation: app.authenticate }, async (req, reply) => {
      try {
        const [statuses, users, labels] = await Promise.all([
          app.objection.models.taskStatus.query(),
          app.objection.models.user.query(),
          app.objection.models.label.query(),
        ]);
        const task = new app.objection.models.task(); // Para los valores por defecto del formulario
        reply.render('tasks/new', {
          task, statuses, users, labels, errors: {}, // Pasar errors vacío
        });
      } catch (err) {
        console.error('Error al cargar formulario de nueva tarea:', err);
        req.flash('error', i18next.t('flash.common.error.loadFailed', { resource: 'new task form' }));
        reply.redirect(app.reverse('tasks'));
      }
      return reply;
    })

    // 3. Crear una tarea
    .post('/tasks', { preValidation: app.authenticate }, async (req, reply) => {
      const { data: formData } = req.body;
      // Normalizar labelIds: asegurarse de que sea un array de números
      const labelIds = normalizeMultiSelect(formData.labels);

      const taskDataForGraph = {
        creatorId: req.user.id,
        statusId: Number(formData.statusId), // El schema requiere que sea un número
        executorId: formData.executorId ? Number(formData.executorId) : null,
        name: formData.name,
        description: formData.description,
        // Para insertGraph con { relate: true }, pasamos los IDs de las etiquetas a relacionar
        labels: labelIds.map(id => ({ id })), // Formato esperado por insertGraph para relacionar existentes
      };

      try {
        // insertGraph valida contra el jsonSchema de Task y luego intenta insertar
        // el grafo (tarea + relaciones con etiquetas existentes).
        await app.objection.models.task.query()
          .insertGraph(taskDataForGraph, { relate: ['labels'] }); // Relacionar etiquetas existentes por ID

        req.flash('info', i18next.t('flash.task.create.success'));
        reply.redirect(app.reverse('tasks'));
      } catch (err) { // err podría ser ValidationError u otro error de DB
        console.error('Error al crear tarea con insertGraph:', err.data || err.message);
        req.flash('error', i18next.t('flash.task.create.error'));

        const [statuses, users, labels] = await Promise.all([
          app.objection.models.taskStatus.query(),
          app.objection.models.user.query(),
          app.objection.models.label.query(),
        ]);
        
        const taskInstance = new app.objection.models.task();
        taskInstance.$set(formData); // Repoblar con los datos originales del formulario

        // El código 422 es más apropiado para errores de validación.
        // Si tus otros tests esperan 200, podrías necesitar ajustar.
        reply.code(err.name === 'ValidationError' ? 422 : 500);
        reply.render('tasks/new', {
          task: taskInstance, // Pasar la instancia con los datos del formulario
          errors: err.data || { general: { message: 'An unexpected error occurred.' } },
          statuses,
          users,
          labels,
        });
      }
      return reply;
    })

    // 4. Ver una tarea específica
    .get('/tasks/:id', { name: 'task', preValidation: app.authenticate }, async (req, reply) => { // Cambiado el nombre de ruta a 'task'
      try {
        const task = await app.objection.models.task.query()
          .findById(req.params.id)
          .withGraphJoined('[status, creator, executor, labels]');

        if (!task) {
          req.flash('error', i18next.t('flash.task.view.errorNotFound'));
          return reply.redirect(app.reverse('tasks'));
        }
        reply.render('tasks/show', { task });
      } catch (err) {
        console.error('Error al ver tarea:', err);
        req.flash('error', i18next.t('flash.common.error.unexpected'));
        reply.redirect(app.reverse('tasks'));
      }
      return reply;
    })

    // 5. Formulario para editar una tarea
    .get('/tasks/:id/edit', { name: 'editTask', preValidation: app.authenticate }, async (req, reply) => {
      try {
        const [taskFromDb, statuses, users, allLabels] = await Promise.all([
          app.objection.models.task.query().findById(req.params.id).withGraphFetched('labels'),
          app.objection.models.taskStatus.query(),
          app.objection.models.user.query(),
          app.objection.models.label.query(),
        ]);

        if (!taskFromDb) {
          req.flash('error', i18next.t('flash.task.view.errorNotFound'));
          return reply.redirect(app.reverse('tasks'));
        }

        if (taskFromDb.creatorId !== req.user.id) {
          req.flash('error', i18next.t('flash.task.authError'));
          return reply.redirect(app.reverse('tasks'));
        }
        
        // Preparar datos para el formulario, incluyendo los IDs de las etiquetas seleccionadas
        const taskDataForForm = {
          ...taskFromDb,
          labels: taskFromDb.labels ? taskFromDb.labels.map(({ id }) => id) : [],
        };

        reply.render('tasks/edit', {
          task: taskDataForForm,
          statuses,
          users,
          labels: allLabels, // Pasar todas las etiquetas disponibles para el select
          errors: {},
        });
      } catch (err) {
         console.error('Error al cargar formulario de edición de tarea:', err);
        req.flash('error', i18next.t('flash.common.error.loadFailed', { resource: 'task edit form' }));
        reply.redirect(app.reverse('tasks'));
      }
      return reply;
    })
    
    // 6. Actualizar una tarea
    .patch('/tasks/:id', { name: 'updateTask', preValidation: app.authenticate }, async (req, reply) => {
      const { id: taskId } = req.params;
      const { data: formData } = req.body;
      const labelIds = normalizeMultiSelect(formData.labels);

      const task = await app.objection.models.task.query().findById(taskId);
      if (!task) {
        req.flash('error', i18next.t('flash.task.view.errorNotFound'));
        return reply.redirect(app.reverse('tasks'));
      }
      if (task.creatorId !== req.user.id) {
        req.flash('error', i18next.t('flash.task.authError'));
        return reply.redirect(app.reverse('tasks'));
      }

      const taskDataForGraph = {
        id: Number(taskId), // upsertGraph necesita el ID
        // creatorId no se actualiza
        statusId: Number(formData.statusId),
        name: formData.name,
        description: formData.description,
        executorId: formData.executorId ? Number(formData.executorId) : null,
        // Para upsertGraph, pasamos objetos completos para relaciones si queremos crearlas/actualizarlas,
        // o solo IDs si queremos relacionar existentes.
        labels: labelIds.map(id => ({ id: Number(id) })), // Relacionar etiquetas existentes por ID
      };

      try {
        // upsertGraph es poderoso: actualiza la tarea y maneja las relaciones de etiquetas.
        // { relate: true, unrelate: true } asegura que las etiquetas se sincronicen.
        // noDelete: true para las etiquetas significa que no eliminará etiquetas de la tabla 'labels', solo de la unión.
        await app.objection.models.task.query()
          .upsertGraph(taskDataForGraph, { relate: true, unrelate: true, noDelete: true });

        req.flash('info', i18next.t('flash.task.edit.success'));
        reply.redirect(app.reverse('tasks'));
      } catch (err) { // Puede ser ValidationError u otro error
        console.error(`Error al actualizar tarea ${taskId} con upsertGraph:`, err.data || err.message);
        req.flash('error', i18next.t('flash.task.edit.error'));

        const [statuses, users, labels] = await Promise.all([
          app.objection.models.taskStatus.query(),
          app.objection.models.user.query(),
          app.objection.models.label.query(),
        ]);
        
        // Repoblar el task para el formulario con los datos que se intentaron enviar y los errores
        const taskForForm = { ...task, ...formData, id: Number(taskId), labels: labelIds };

        reply.code(err.name === 'ValidationError' ? 422 : 500);
        reply.render('tasks/edit', {
          task: taskForForm,
          errors: err.data || { general: { message: 'An unexpected error occurred.' } },
          statuses,
          users,
          labels,
        });
      }
      return reply;
    })

    // 7. Eliminar una tarea
    .delete('/tasks/:id', { name: 'deleteTask', preValidation: app.authenticate }, async (req, reply) => { // Agregado 'deleteTask' como nombre de ruta
      const task = await app.objection.models.task.query().findById(req.params.id);

      if (!task) {
          req.flash('error', i18next.t('flash.task.view.errorNotFound'));
          return reply.redirect(app.reverse('tasks'));
      }
      if (task.creatorId !== req.user.id) {
        req.flash('error', i18next.t('flash.task.authError')); // Clave genérica de autorización
        return reply.redirect(app.reverse('tasks'));
      }

      try {
        // No es estrictamente necesario una transacción para desrelacionar y borrar uno, pero no hace daño
        await task.$relatedQuery('labels').unrelate(); // Desvincular todas las etiquetas
        await task.$query().delete(); // Eliminar la tarea
        req.flash('info', i18next.t('flash.task.delete.success'));
      } catch (err) {
        console.error(`Error al eliminar tarea ${req.params.id}:`, err);
        req.flash('error', i18next.t('flash.task.delete.errorDB') || 'Failed to delete task.'); // Clave más específica para error de DB
      }
      reply.redirect(app.reverse('tasks'));
      return reply;
    })
    
    // Ruta para simular DELETE vía POST (para formularios HTML)
    // Asegúrate de que el nombre 'postDeleteTask' sea el que espera tu vista index.pug
    .post('/tasks/:id', { name: 'postDeleteTask', preValidation: app.authenticate }, async (req, reply) => {
        const { id } = req.params;
        // eslint-disable-next-line no-underscore-dangle
        if (req.body && req.body._method === 'DELETE') {
            const task = await app.objection.models.task.query().findById(id);
            if (!task) {
                req.flash('error', i18next.t('flash.task.view.errorNotFound'));
                return reply.redirect(app.reverse('tasks'));
            }
            if (req.user.id !== task.creatorId) {
                req.flash('error', i18next.t('flash.task.authError'));
                return reply.redirect(app.reverse('tasks'));
            }
            try {
                await task.$relatedQuery('labels').unrelate();
                await task.$query().delete();
                req.flash('info', i18next.t('flash.task.delete.success'));
            } catch (err) {
                console.error(`Error al eliminar tarea ${id} (vía POST):`, err);
                req.flash('error', i18next.t('flash.task.delete.errorDB') || 'Failed to delete task via POST.');
            }
            return reply.redirect(app.reverse('tasks'));
        }
        // Si no es un DELETE simulado, podría ser un error o una ruta no manejada
        reply.code(400).send('Invalid action for POST /tasks/:id');
        return reply;
    });
};