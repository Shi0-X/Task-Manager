// src/index.js
// @ts-check

import Fastify from 'fastify';
import plugin from '../server/plugin.js';

export default async function buildApp() {
  const app = Fastify({
    logger: true,
    trustProxy: true, // <— confía en cabeceras X-Forwarded-*
  });

  await app.register(plugin);
  return app;
}
