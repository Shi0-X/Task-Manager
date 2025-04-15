// @ts-check

import Fastify from 'fastify';
import pointOfView from '@fastify/view';
import fastifyStatic from '@fastify/static';
import fastifyFormbody from '@fastify/formbody';
import { fileURLToPath } from 'url';
import path from 'path';
import pug from 'pug';
import i18next from 'i18next';
import en from '../server/locales/en.js';
import welcomeRoutes from '../server/routes/welcome.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = Fastify({ logger: true });

await i18next.init({
  lng: 'en',
  fallbackLng: 'en',
  debug: false,
  resources: {
    en, // Traducciones importadas desde server/locales/en.js
  },
});

const routeMap = {
  root: '/',
  login: '/session/new',
  register: '/users/new',
  users: '/users',
};

app.register(pointOfView, {
  engine: { pug },
  root: path.join(__dirname, '..', 'server', 'views'),
  includeViewExtension: true,
  defaultContext: {
    assetPath: (filename) => `/assets/${filename}`,
    t: i18next.t.bind(i18next),
    route: (name) => routeMap[name] || '#',
  },
});

app.register(fastifyStatic, {
  root: path.join(__dirname, '..', 'public'),
  prefix: '/assets/',
});

app.register(fastifyFormbody);
app.register(welcomeRoutes);

export default app;
