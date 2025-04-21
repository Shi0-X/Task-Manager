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
import fastifyMethodOverride from 'fastify-method-override';
import fastifyObjectionjs from 'fastify-objectionjs';
import qs from 'qs';
import Pug from 'pug';
import i18next from 'i18next';

import ru from './locales/ru.js';
import en from './locales/en.js';
import addRoutes from './routes/index.js';
import getHelpers from './helpers/index.js';
import * as knexConfig from '../knexfile.js';
import models from './models/index.js';
import FormStrategy from './lib/passportStrategies/FormStrategy.js';

const __dirname = fileURLToPath(path.dirname(import.meta.url));
const mode = process.env.NODE_ENV || 'development';
const isProd = mode === 'production';

async function registerPlugins(app) {
  // 1) sensible + form parser
  await app.register(fastifySensible);
  await app.register(fastifyFormbody, { parser: qs.parse });

  // 2) secure-session
  await app.register(fastifySecureSession, {
    secret: process.env.SESSION_KEY,
    cookie: {
      path: '/',
      secure: true,         // HTTPS obligatorio
      sameSite: 'none',     // permite envío cross-site
      httpOnly: true,       // (opcional) sólo servidor
    },
  });
  
  // 3) Passport
  fastifyPassport.registerUserDeserializer((user) =>
    app.objection.models.user.query().findById(user.id)
  );
  fastifyPassport.registerUserSerializer((user) =>
    Promise.resolve(user)
  );
  fastifyPassport.use(new FormStrategy('form', app));
  await app.register(fastifyPassport.initialize());
  await app.register(fastifyPassport.secureSession());
  app.decorate('fp', fastifyPassport);
  app.decorate(
    'authenticate',
    (...args) =>
      fastifyPassport.authenticate('form', {
        failureRedirect: '/session/new',
        failureFlash: i18next.t('flash.authError'),
      })(...args)
  );

  // 4) method‑override + ORM
  await app.register(fastifyMethodOverride);
  await app.register(fastifyObjectionjs, {
    knexConfig: knexConfig[mode],
    models,
  });
}

async function setUpViews(app) {
  const helpers = getHelpers(app);

  // 5) fastify-view + pug
  await app.register(fastifyView, {
    engine: { pug: Pug },
    includeViewExtension: true,
    templates: path.join(__dirname, '..', 'server', 'views'),
    defaultContext: {
      ...helpers,
      assetPath: (filename) => `/assets/${filename}`,
    },
  });

  // 6) Override render() para inyectar flash() e isAuthenticated()
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

async function setupLocalization() {
  await i18next.init({
    lng: 'en',
    fallbackLng: 'ru',
    resources: { ru, en },
  });
}

function setUpStaticAssets(app) {
  const publicDir = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(publicDir)) {
    app.register(fastifyStatic, {
      root: publicDir,
      prefix: '/assets/',
    });
  }
}

export default async function plugin(app, _opts) {
  await registerPlugins(app);
  await setupLocalization();
  await setUpViews(app);
  setUpStaticAssets(app);

  // 7) Ejecutar migraciones una vez que todos los plugins estén listos
  app.addHook('onReady', async () => {
    await app.objection.knex.migrate.latest();
  });

  // Ignorar favicon.ico
  app.setNotFoundHandler((req, reply) => {
    if (req.raw.url === '/favicon.ico') {
      return reply.code(204).send();
    }
    reply.callNotFound();
  });

  // Hook de debug sólo en desarrollo
  if (!isProd) {
    app.addHook('preHandler', (req, reply, done) => {
      console.log('─── DEBUG preHandler ───');
      console.log('Cookie header:', req.headers.cookie || '<no cookie>');
      let sessData = {};
      try {
        const f = req.session.get('flash');
        if (f) sessData.flash = f;
      } catch {
        sessData.error = 'no session available';
      }
      console.log('Session store:', sessData);
      console.log(
        'isAuthenticated():',
        typeof req.isAuthenticated === 'function'
          ? req.isAuthenticated()
          : '<no method>'
      );
      console.log('──────────────────────────\n');
      done();
    });
  }

  addRoutes(app);
  return app;
}
