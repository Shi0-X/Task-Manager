// server/routes/labels.js
// @ts-check

import i18next from 'i18next';

export default (app) => {
  app
    // 1. Lista de etiquetas
    .get('/labels', { name: 'labels' }, async (req, reply) => {
      try {
        const labels = await app.objection.models.label.query();
        return reply.render('labels/index', { labels });
      } catch (err) {
        console.error('Error al obtener etiquetas:', err);
        req.flash('error', i18next.t('flash.label.create.error'));
        return reply.redirect(app.reverse('root'));
      }
    })
    
    // 2. Formulario para crear una etiqueta
    .get('/labels/new', {
      name: 'newLabel',
      preValidation: app.authenticate,
    }, async (req, reply) => {
      const label = new app.objection.models.label();
      return reply.render('labels/new', { label });
    })
    
    // 3. Formulario para editar una etiqueta
    .get('/labels/:id/edit', {
      name: 'editLabel',
      preValidation: app.authenticate,
    }, async (req, reply) => {
      const { id } = req.params;
      const label = await app.objection.models.label.query().findById(id);
      
      if (!label) {
        req.flash('error', i18next.t('flash.label.edit.error'));
        return reply.redirect(app.reverse('labels'));
      }
      
      return reply.render('labels/edit', { label });
    })
    
    // 4. Crear una etiqueta
    .post('/labels', {
      name: 'createLabel',
      preValidation: app.authenticate,
    }, async (req, reply) => {
      console.log('=== INICIO DE CREACIÓN DE ETIQUETA ===');
      console.log('Cuerpo completo de la solicitud:', req.body);
      console.log('Datos del formulario:', req.body.data);
      console.log('Usuario autenticado:', req.user ? `ID: ${req.user.id}` : 'No autenticado');
      
      try {
        // Crear la etiqueta
        const label = new app.objection.models.label();
        console.log('Objeto label inicial:', label);
        
        if (req.body.data) {
          label.$set(req.body.data);
          console.log('Objeto label después de $set:', label);
        } else {
          console.error('ERROR: req.body.data es undefined o null');
        }
        
        // Validar que el nombre no está vacío
        if (!label.name || label.name.trim() === '') {
          console.log('ERROR: Nombre de etiqueta vacío');
          req.flash('error', i18next.t('flash.label.create.error'));
          return reply.render('labels/new', { 
            label, 
            errors: { name: [{ message: 'Name is required' }] } 
          });
        }
        
        // Verificar esquema JSON antes de insertar
        console.log('Validando esquema JSON para label...');
        try {
          const validationResult = await app.objection.models.label.jsonSchema.validate(label);
          console.log('Resultado de validación de esquema:', validationResult);
        } catch (validationErr) {
          console.error('Error de validación de esquema:', validationErr);
        }
        
        // Insertar en la base de datos
        console.log('Intentando insertar etiqueta en la BD:', label);
        const validLabel = await app.objection.models.label.query().insert(label);
        console.log('Etiqueta creada exitosamente:', validLabel);
        
        req.flash('info', i18next.t('flash.label.create.success'));
        return reply.redirect(app.reverse('labels'));
      } catch (err) {
        // Logging detallado del error
        console.error('===== ERROR AL CREAR ETIQUETA =====');
        console.error('Mensaje de error:', err.message);
        console.error('Stack trace:', err.stack);
        console.error('Tipo de error:', err.constructor.name);
        
        if (err.data) console.error('Datos del error:', JSON.stringify(err.data, null, 2));
        if (err.nativeError) console.error('Error nativo:', err.nativeError);
        
        // Si es un error de base de datos, mostrar detalles adicionales
        if (err.code || err.errno || err.sqlState) {
          console.error('Detalles de error de BD:', {
            code: err.code,
            errno: err.errno,
            sqlState: err.sqlState,
            sqlMessage: err.sqlMessage
          });
        }
        
        req.flash('error', i18next.t('flash.label.create.error'));
        return reply.render('labels/new', { 
          label: req.body.data || {}, 
          errors: err.data || { general: [{ message: err.message }] } 
        });
      }
    })
    
    // 5. Actualizar una etiqueta
    .patch('/labels/:id', {
      name: 'updateLabel',
      preValidation: app.authenticate,
    }, async (req, reply) => {
      const { id } = req.params;
      
      try {
        const label = await app.objection.models.label.query().findById(id);
        
        if (!label) {
          req.flash('error', i18next.t('flash.label.edit.error'));
          return reply.redirect(app.reverse('labels'));
        }
        
        // Validar que el nombre no está vacío
        if (!req.body.data.name || req.body.data.name.trim() === '') {
          req.flash('error', i18next.t('flash.label.edit.error'));
          return reply.render('labels/edit', { 
            label: { ...label, ...req.body.data }, 
            errors: { name: [{ message: 'Name is required' }] } 
          });
        }
        
        await label.$query().patch(req.body.data);
        req.flash('info', i18next.t('flash.label.edit.success'));
        return reply.redirect(app.reverse('labels'));
      } catch (err) {
        console.error('Error al actualizar etiqueta:', err);
        req.flash('error', i18next.t('flash.label.edit.error'));
        
        const label = await app.objection.models.label.query().findById(id);
        return reply.render('labels/edit', { 
          label: { ...label, ...req.body.data }, 
          errors: err.data || {} 
        });
      }
    })
    
    // 6. Eliminar una etiqueta
    .delete('/labels/:id', {
      name: 'deleteLabel',
      preValidation: app.authenticate,
    }, async (req, reply) => {
      const { id } = req.params;
      
      try {
        // Verificar si la etiqueta está asociada a alguna tarea
        const trx = await app.objection.models.label.startTransaction();
        
        try {
          // Verificar si hay tareas con esta etiqueta
          const tasksLabelsCount = await trx('tasks_labels')
            .where('label_id', id)
            .count('* as count')
            .first();
          
          if (tasksLabelsCount && parseInt(tasksLabelsCount.count, 10) > 0) {
            await trx.rollback();
            req.flash('error', i18next.t('flash.label.delete.error'));
            return reply.redirect(app.reverse('labels'));
          }
          
          // Eliminar la etiqueta
          await app.objection.models.label.query(trx).deleteById(id);
          await trx.commit();
          
          req.flash('info', i18next.t('flash.label.delete.success'));
          return reply.redirect(app.reverse('labels'));
        } catch (err) {
          await trx.rollback();
          throw err;
        }
      } catch (err) {
        console.error('Error al eliminar etiqueta:', err);
        req.flash('error', i18next.t('flash.label.delete.error'));
        return reply.redirect(app.reverse('labels'));
      }
    });
};