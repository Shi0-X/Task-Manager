// server/routes/welcome.js
// @ts-check

export default (app) => {
  app.get(
    '/',
    { name: 'root' },
    (req, reply) => {
      // Antes era reply.view, ahora usamos render:
      return reply.render('welcome/index');
    }
  );
};
