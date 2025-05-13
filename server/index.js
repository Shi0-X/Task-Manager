// server/index.js

import dotenv from 'dotenv';

import buildApp from '../src/index.js';

dotenv.config();

const start = async () => {
  try {
    const app = await buildApp();

    const port = process.env.PORT || 3000;
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`Server listening on port ${port}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

start();
