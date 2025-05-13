// server/plugins/rollbar-plugin.js
// @ts-check

import fp from 'fastify-plugin';
import rollbar from '../lib/rollbar.js';

export default fp(async (fastify, opts) => {
  // Registrar Rollbar como una decoración para acceder desde cualquier ruta
  fastify.decorate('rollbar', rollbar);

  // Error handler global
  fastify.setErrorHandler((error, request, reply) => {
    // Obtener información relevante del request
    const requestData = {
      method: request.method,
      url: request.url,
      headers: request.headers,
      params: request.params,
      query: request.query,
    };

    // Registrar el error en Rollbar
    rollbar.error(error, requestData);

    // Log local para depuración
    fastify.log.error(error);

    // Determinar el código de estado
    const statusCode = error.statusCode || 500;

    // Responder al cliente
    reply
      .status(statusCode)
      .send({
        error: statusCode >= 500
          ? 'Internal Server Error'
          : error.message,
      });
  });

  // Hook para errores no manejados
  fastify.addHook('onError', (request, reply, error, done) => {
    rollbar.error(error, request);
    done();
  });
}, {
  name: 'rollbar-plugin',
  fastify: '>=4.0.0',
});
