// @ts-check
import i18next from 'i18next';

export default (app) => {
  app.get('/session/new', { name: 'newSession' }, (req, reply) => {
    const signInForm = {};
    return reply.view('session/new', { signInForm });
  });

  // Ruta POST para iniciar sesión: se reemplaza la autenticación real por un dummy
  app.post('/session', { name: 'session' }, async (req, reply) => {
    // Por el momento, siempre se simula un error de autenticación
    const signInForm = req.body.data;
    const errors = {
      email: [{ message: i18next.t('flash.session.create.error') }],
    };
    return reply.view('session/new', { signInForm, errors });
  });

  app.delete('/session', (req, reply) => {
    // Simula el cierre de sesión
    req.flash('info', i18next.t('flash.session.delete.success'));
    return reply.redirect(app.reverse('root'));
  });
};
