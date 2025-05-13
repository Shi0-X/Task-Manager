// server/routes/statuses.js
import i18next from 'i18next';

export default (app) => {
  app
    .get('/statuses', { name: 'statuses' }, async (req, reply) => {
      const statuses = await app.objection.models.taskStatus.query();
      reply.render('statuses/index', { statuses });
      return reply;
    })
    .get('/statuses/new', {
      name: 'newStatus',
      preValidation: app.authenticate,
    }, (req, reply) => {
      const status = new app.objection.models.taskStatus();
      reply.render('statuses/new', { status });
      return reply;
    })
    .post('/statuses', {
      name: 'createStatus',
      preValidation: app.authenticate,
    }, async (req, reply) => {
      console.log('Cuerpo completo de la solicitud (creación):', req.body);

      const status = new app.objection.models.taskStatus();

      if (req.body.data) {
        console.log('Datos del formulario (creación):', req.body.data);
        status.$set(req.body.data);
      } else {
        console.log('No se encontraron datos en req.body.data');
        status.$set({ name: req.body.name });
      }

      console.log('Objeto status antes de insertar:', status);

      try {
        const validStatus = await app.objection.models.taskStatus.query().insert(status);
        console.log('Status insertado correctamente:', validStatus);
        req.flash('info', i18next.t('flash.statuses.create.success'));
        reply.redirect(app.reverse('statuses'));
        return reply;
      } catch (err) {
        console.error('Error al insertar status:', err);
        console.error('Mensaje de error:', err.message);
        req.flash('error', i18next.t('flash.statuses.create.error'));
        reply.render('statuses/new', { status, errors: err.data });
        return reply;
      }
    })
    .get('/statuses/:id/edit', {
      name: 'editStatus',
      preValidation: app.authenticate,
    }, async (req, reply) => {
      const { id } = req.params;
      const status = await app.objection.models.taskStatus.query().findById(id);
      console.log('Estado encontrado para el formulario de edición:', status);
      reply.render('statuses/edit', { status });
      return reply;
    })
    .patch('/statuses/:id', {
      name: 'updateStatus',
      preValidation: app.authenticate,
    }, async (req, reply) => {
      const { id } = req.params;
      console.log('Actualización de estado con ID:', id);
      console.log('Cuerpo completo de la solicitud (actualización):', req.body);

      const status = await app.objection.models.taskStatus.query().findById(id);
      console.log('Estado encontrado para actualizar:', status);

      try {
        // Verificación de datos y manejo de casos alternos
        let dataToUpdate = {};
        if (req.body.data) {
          console.log('Datos para actualizar desde req.body.data:', req.body.data);
          dataToUpdate = req.body.data;
        } else if (req.body.name) {
          console.log('Datos para actualizar desde req.body.name:', req.body.name);
          dataToUpdate = { name: req.body.name };
        }

        console.log('Datos finales para actualizar:', dataToUpdate);

        // Realizar la actualización si hay datos
        if (Object.keys(dataToUpdate).length > 0) {
          const updatedStatus = await status.$query().patch(dataToUpdate);
          console.log('Estado actualizado correctamente:', updatedStatus);
          req.flash('info', i18next.t('flash.statuses.edit.success'));
        } else {
          console.log('No hay datos para actualizar');
          req.flash('error', 'No data provided for update');
        }

        reply.redirect(app.reverse('statuses'));
        return reply;
      } catch (err) {
        console.error('Error al actualizar estado:', err);
        console.error('Mensaje de error:', err.message);
        if (err.data) console.error('Errores de validación:', err.data);
        req.flash('error', i18next.t('flash.statuses.edit.error'));
        reply.render('statuses/edit', { status, errors: err.data || {} });
        return reply;
      }
    })
    .delete('/statuses/:id', {
      name: 'deleteStatus',
      preValidation: app.authenticate,
    }, async (req, reply) => {
      const { id } = req.params;
      console.log('Eliminación de estado con ID:', id);

      try {
        // Verificar si el estado existe antes de intentar eliminarlo
        const status = await app.objection.models.taskStatus.query().findById(id);

        if (!status) {
          console.log('El estado no existe');
          req.flash('error', 'Status not found');
          reply.redirect(app.reverse('statuses'));
          return reply;
        }

        // NUEVO: Verificar si hay tareas usando este estado
        const tasksWithStatus = await app.objection.models.task.query()
          .where('statusId', id)
          .first();

        if (tasksWithStatus) {
          console.log('No se puede eliminar estado, hay tareas asociadas:', tasksWithStatus);
          req.flash('error', i18next.t('flash.statuses.delete.hasTasks'));
          reply.redirect(app.reverse('statuses'));
          return reply;
        }

        console.log('Estado encontrado para eliminar:', status);

        // Intentar eliminar el estado
        const deleted = await app.objection.models.taskStatus.query().deleteById(id);
        console.log('Resultado de la eliminación:', deleted);

        if (deleted) {
          req.flash('info', i18next.t('flash.statuses.delete.success'));
        } else {
          req.flash('error', 'Failed to delete status');
        }

        reply.redirect(app.reverse('statuses'));
        return reply;
      } catch (err) {
        console.error('Error al eliminar estado:', err);
        console.error('Mensaje de error:', err.message);
        req.flash('error', i18next.t('flash.statuses.delete.error'));
        reply.redirect(app.reverse('statuses'));
        return reply;
      }
    });
};
