// server/index.js
import dotenv from 'dotenv';
dotenv.config();

import buildApp from '../src/index.js';
import Knex from 'knex';
import * as knexConfig from '../knexfile.js';

const mode = process.env.NODE_ENV || 'development';

const start = async () => {
  try {
    // 1) Armar la app con todos los plugins
    const app = await buildApp();

    // 2) Ejecutar migraciones ANTES de levantar el servidor,
    //    usando un knex independiente para no depender de app.objection
    const knex = Knex(knexConfig[mode]);
    await knex.migrate.latest();

    // 3) Arrancar Fastify
    const port = process.env.PORT || 3000;
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`Server listening on port ${port}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

start();
