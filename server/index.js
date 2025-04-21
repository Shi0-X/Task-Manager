// src/index.js
// @ts-check

import Fastify from 'fastify';
import plugin from '../server/plugin.js';

export default async function buildApp() {
  // Creamos la app
  const app = Fastify({ logger: true });

  // Indicamos que confíe en X-Forwarded-* (proxy de Render)
  app.setTrustProxy(true);

  // Registramos nuestro plugin central
  await app.register(plugin);

  return app;
}
