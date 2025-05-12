// server/routes/tasks.js - Versión corregida
// @ts-check

import i18next from 'i18next';

export default (app) => {
  // Middleware para verificar que solo el creador pueda eliminar la tarea
  const checkTaskOwnership = async (req, reply) => {
    const { id } = req.params;
    const task = await app.objection.models.task.query().findById(id);
    
    // Si la tarea no existe, redirigir
    if (!task) {
      req.flash('error', i18next.t('flash.task.view.error')); // Cambiar a mensaje genérico
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
          .withGraphJoined('[status, creator, executor]');
        
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
        
        return reply.render('tasks/new', {
          task,
          statuses,
          users,
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
          .withGraphJoined('[status, creator, executor]');
        
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
        const task = await app.objection.models.task.query().findById(id);
        
        if (!task) {
          req.flash('error', i18next.t('flash.task.view.error')); // Cambiar a mensaje genérico
          return reply.redirect(app.reverse('tasks'));
        }
        
        const statuses = await app.objection.models.taskStatus.query();
        const users = await app.objection.models.user.query();
        
        return reply.render('tasks/edit', {
          task,
          statuses,
          users,
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
        const task = new app.objection.models.task();
        task.$set({ ...req.body.data, creatorId: req.user.id });
        
        const validTask = await app.objection.models.task.query().insert(task);
        req.flash('info', i18next.t('flash.task.create.success'));
        return reply.redirect(app.reverse('tasks'));
      } catch (err) {
        console.error('Error al crear tarea:', err);
        req.flash('error', i18next.t('flash.task.create.error'));
        
        const statuses = await app.objection.models.taskStatus.query();
        const users = await app.objection.models.user.query();
        
        return reply.render('tasks/new', {
          task: req.body.data,
          statuses,
          users,
          currentUser: req.user,
          errors: err.data || {},
        });
      }
    })
    
    // 6. Actualizar una tarea
    .patch('/tasks/:id', {
      name: 'updateTask',
      preValidation: app.authenticate, // SOLO verificar autenticación, NO propiedad
    }, async (req, reply) => {
      try {
        const { id } = req.params;
        const task = await app.objection.models.task.query().findById(id);
        
        if (!task) {
          req.flash('error', i18next.t('flash.task.edit.error'));
          return reply.redirect(app.reverse('tasks'));
        }
        
        // NO verificar si el usuario es el creador aquí
        // Cualquier usuario autenticado puede editar una tarea
        
        // Convertir IDs a números
        if (req.body.data.statusId) {
          req.body.data.statusId = Number(req.body.data.statusId);
        }
        if (req.body.data.executorId) {
          req.body.data.executorId = req.body.data.executorId ? Number(req.body.data.executorId) : null;
        }
        
        await task.$query().patch(req.body.data);
        req.flash('info', i18next.t('flash.task.edit.success'));
        return reply.redirect(app.reverse('tasks'));
      } catch (err) {
        console.error('Error al actualizar tarea:', err);
        req.flash('error', i18next.t('flash.task.edit.error')); // Usar mensaje específico de edición
        
        const statuses = await app.objection.models.taskStatus.query();
        const users = await app.objection.models.user.query();
        
        return reply.render('tasks/edit', {
          task: { ...await app.objection.models.task.query().findById(req.params.id), ...req.body.data },
          statuses,
          users,
          currentUser: req.user,
          errors: err.data || {},
        });
      }
    })
    
    // 7. Eliminar una tarea - MODIFICADO
    .delete('/tasks/:id', {
      name: 'deleteTask',
      preValidation: [app.authenticate, checkTaskOwnership], // Aquí SÍ verificamos propiedad
    }, async (req, reply) => {
      try {
        const { id } = req.params;
        console.log(`Eliminando tarea con ID ${id}`);
        
        await app.objection.models.task.query().deleteById(id);
        
        req.flash('info', i18next.t('flash.task.delete.success'));
        // Asegúrate de que siempre redireccione a la lista de tareas
        return reply.redirect(app.reverse('tasks'));
      } catch (err) {
        console.error('Error al eliminar tarea:', err);
        req.flash('error', i18next.t('flash.task.delete.error'));
        return reply.redirect(app.reverse('tasks'));
      }
    })
    
    // Añadir ruta POST adicional para manejar DELETE
    .post('/tasks/:id', {
      name: 'postDeleteTask',
      preValidation: [app.authenticate], // Quitar checkTaskOwnership de preValidation
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
          
          await app.objection.models.task.query().deleteById(id);
          
          req.flash('info', i18next.t('flash.task.delete.success'));
          return reply.redirect(app.reverse('tasks'));
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