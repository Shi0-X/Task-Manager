// src/index.js
// @ts-check

import Fastify from 'fastify';
import plugin from '../server/plugin.js';

export default async function buildApp() {
  // Creamos la app con trustProxy habilitado para Render u otro proxy
  const app = Fastify({
    logger: true,
    trustProxy: true,
  });

  // Registramos nuestro plugin central (vistas, static, i18n, sesiones…)
  await app.register(plugin);

  return app;
}
