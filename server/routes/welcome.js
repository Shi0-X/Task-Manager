// @ts-check

export default async function welcomeRoutes(app) {
  app.get('/', { name: 'root' }, async (req, reply) => {
    console.log('Rendering /');
    return reply.view('welcome/index');
  });

  // Ruta protegida (si usas autenticación, ajusta el preValidation)
  app.get(
    '/protected',
    { name: 'protected', preValidation: app.authenticate },
    async (req, reply) => {
      return reply.view('welcome/index');
    }
  );
}
