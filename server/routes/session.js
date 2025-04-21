// server/routes/session.js
// @ts-check

import i18next from 'i18next';

export default (app) => {
  // Mostrar formulario de login
  app.get(
    '/session/new',
    { name: 'newSession' },
    (req, reply) => {
      return reply.render('session/new', { signInForm: {} });
    },
  );

  // Procesar login real
  app.post(
    '/session',
    { name: 'session', preValidation: app.authenticate },
    (req, reply) => {
      req.flash('success', i18next.t('flash.session.create.success'));
      // Redirigimos a la raíz tras un login exitoso
      return reply.redirect('/');
    },
  );

  // Cerrar sesión
  app.delete(
    '/session',
    { name: 'sessionDelete' },
    (req, reply) => {
      req.logout();
      req.flash('info', i18next.t('flash.session.delete.success'));
      // Redirigimos a la raíz tras el logout
      return reply.redirect('/');
    },
  );
};
