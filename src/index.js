// @ts-check

import Fastify from 'fastify';

const app = Fastify({ logger: true });

app.get('/', async (request, reply) => {
  return { message: '¡Bienvenido al Gestor de Tareas!' };
});

export default app;
