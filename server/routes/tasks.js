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
        const tasks = await app.objection.models.task.query()
          .withGraphJoined('[status, creator, executor, labels]');
        
        return reply.render('tasks/index', { tasks });
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
          currentUser: req.user
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
          currentUser: req.user 
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
          currentUser: req.user
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
      try {
        const trx = await app.objection.models.task.startTransaction();
        
        try {
          // Extraer los IDs de etiquetas del formulario
          const labelIds = req.body.data.labels ? 
            _.castArray(req.body.data.labels).map(Number) : 
            [];
          
          // Eliminar labels del objeto data para la creación de la tarea
          const { labels, ...taskData } = req.body.data;
          
          // Crear la tarea
          const task = new app.objection.models.task();
          task.$set({ ...taskData, creatorId: req.user.id });
          
          const validTask = await app.objection.models.task.query(trx).insert(task);
          
          // Asociar etiquetas a la tarea
          if (labelIds.length > 0) {
            const labelRelations = labelIds.map(labelId => ({
              task_id: validTask.id,
              label_id: labelId
            }));
            
            await trx('tasks_labels').insert(labelRelations);
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
        req.flash('error', i18next.t('flash.task.create.error'));
        
        const statuses = await app.objection.models.taskStatus.query();
        const users = await app.objection.models.user.query();
        const labels = await app.objection.models.label.query();
        
        return reply.render('tasks/new', {
          task: req.body.data,
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
          const labelIds = req.body.data.labels ? 
            _.castArray(req.body.data.labels).map(Number) : 
            [];
          
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
            const labelRelations = labelIds.map(labelId => ({
              task_id: id,
              label_id: labelId
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
      } else {
        // No es una solicitud de eliminación, rechazar
        reply.code(400).send({ error: 'Bad Request' });
      }
    });
};