// server/index.js
import dotenv from 'dotenv';
dotenv.config();

import buildApp from '../src/index.js';

const start = async () => {
  try {
    const app = await buildApp();

    // si quieres que en producción aplique migraciones automáticamente
    if (process.env.NODE_ENV === 'production') {
      await app.objection.knex.migrate.latest();
    }

    const port = Number(process.env.PORT) || 3000;    // <— aquí
    await app.listen({ port, host: '0.0.0.0' });     // <— y aquí
    app.log.info(`Server listening on port ${port}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

start();
