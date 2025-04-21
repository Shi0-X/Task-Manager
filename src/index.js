// src/index.js
// @ts-check

import Fastify from 'fastify';
import plugin from '../server/plugin.js';

export default async function buildApp() {
  const app = Fastify({ logger: true });
  app.setTrustProxy(true);           // necesario para X‑Forwarded‑For / proxy de Render
  await app.register(plugin);
  return app;
}
