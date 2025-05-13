// server/plugin.js
// @ts-check

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import fastifyStatic from '@fastify/static';
import fastifyView from '@fastify/view';
import fastifyFormbody from '@fastify/formbody';
import fastifySecureSession from '@fastify/secure-session';
import fastifyPassport from '@fastify/passport';
import fastifySensible from '@fastify/sensible';
import { plugin as fastifyReverseRoutes } from 'fastify-reverse-routes';
import fastifyMethodOverride from 'fastify-method-override';
import fastifyObjectionjs from 'fastify-objectionjs';
import qs from 'qs';
import Pug from 'pug';
import i18next from 'i18next';
// eslint-disable-next-line import/no-extraneous-dependencies
import dotenv from 'dotenv';

import ru from './locales/ru.js';
import en from './locales/en.js';
// @ts-ignore
import addRoutes from './routes/index.js';
import getHelpers from './helpers/index.js';
import * as knexConfig from '../knexfile.js';
import models from './models/index.js';
import FormStrategy from './lib/passportStrategies/FormStrategy.js';
import rollbar from './lib/rollbar.js';

// Cargar variables de entorno
dotenv.config();

const __dirname = fileURLToPath(path.dirname(import.meta.url));
const mode = process.env.NODE_ENV || 'development';

async function registerPlugins(app) {
  // Decorar la app con rollbar para uso global
  app.decorate('rollbar', rollbar);

  // 1) sensible + form parser
  await app.register(fastifySensible);
  await app.register(fastifyFormbody, { parser: qs.parse });

  // 2) reverse-routes for app.reverse()
  await app.register(fastifyReverseRoutes, { exposeHeadRoutes: false });

  // 3) secure-session
  await app.register(fastifySecureSession, {
    secret: process.env.SESSION_KEY,
    cookie: { path: '/' },
  });

  // 4) Passport
  // Dividimos la línea larga en dos para respetar el límite de longitud
  // eslint-disable-next-line max-len
  fastifyPassport.registerUserDeserializer((user) => app.objection.models.user.query().findById(user.id));
  fastifyPassport.registerUserSerializer((user) => Promise.resolve(user));
  fastifyPassport.use(new FormStrategy('form', app));
  await app.register(fastifyPassport.initialize());
  await app.register(fastifyPassport.secureSession());
  app.decorate('fp', fastifyPassport);
  app.decorate(
    'authenticate',
    (...args) => fastifyPassport.authenticate('form', {
      failureRedirect: app.reverse('root'),
      failureFlash: i18next.t('flash.authError'),
    })(...args),
  );

  // 5) method-override + ORM
  await app.register(fastifyMethodOverride);
  await app.register(fastifyObjectionjs, {
    knexConfig: knexConfig[mode],
    models,
  });
}

async function setUpViews(app) {
  const helpers = getHelpers(app);
  await app.register(fastifyView, {
    engine: { pug: Pug },
    includeViewExtension: true,
    templates: path.join(__dirname, '..', 'server', 'views'),
    defaultContext: {
      ...helpers,
      assetPath: (filename) => `/assets/${filename}`,
    },
  });

  // Override render to inject flash & isAuthenticated
  // eslint-disable-next-line func-names
  app.decorateReply('render', function (viewPath, locals = {}) {
    const reply = this;
    function flashFn() {
      const store = reply.request.session.get('flash') || {};
      reply.request.session.delete('flash');
      return store;
    }
    return reply.view(viewPath, {
      ...locals,
      reply,
      flash: flashFn,
      isAuthenticated: () => reply.request.isAuthenticated(),
    });
  });
}

function setUpStaticAssets(app) {
  // Serve both dist/ (webpack bundles) and public/ (template assets) under /assets
  const distDir = path.join(__dirname, '..', 'dist');
  const publicDir = path.join(__dirname, '..', 'public');
  const roots = [];
  if (fs.existsSync(distDir)) roots.push(distDir);
  if (fs.existsSync(publicDir)) roots.push(publicDir);
  if (roots.length > 0) {
    app.register(fastifyStatic, {
      root: roots,
      prefix: '/assets/',
    });
  }
}

async function setupLocalization() {
  await i18next.init({
    lng: 'en',
    fallbackLng: 'ru',
    resources: { ru, en },
  });
}

const addHooks = (app) => {
  app.addHook('preHandler', (req, reply, done) => {
    // Expose isAuthenticated to Pug via reply.locals
    reply.locals = { isAuthenticated: () => req.isAuthenticated() };
    done();
  });
};

// Configurar el manejo de errores con Rollbar
function setupErrorHandling(app) {
  // Manejar errores no capturados
  app.setErrorHandler((error, request, reply) => {
    // Registrar el error en Rollbar
    app.rollbar.error(error, request);

    // Log local
    app.log.error(error);

    // Determinar código de estado
    const statusCode = error.statusCode || 500;

    // Responder al cliente
    reply
      .status(statusCode)
      .send({
        statusCode,
        error: statusCode >= 500 ? 'Internal Server Error' : error.message,
        message: error.message,
      });
  });

  // Hook para errores
  app.addHook('onError', (request, reply, error, done) => {
    app.rollbar.error(error, request);
    done();
  });
}

export const options = { exposeHeadRoutes: false };

// eslint-disable-next-line no-unused-vars
export default async function plugin(app, _opts) {
  await registerPlugins(app);
  await setupLocalization();
  setUpViews(app);
  setUpStaticAssets(app);
  addRoutes(app);
  addHooks(app);
  setupErrorHandling(app); // Configurar manejo de errores con Rollbar
  return app;
}
