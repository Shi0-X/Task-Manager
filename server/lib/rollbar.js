// server/lib/rollbar.js
// @ts-check

import Rollbar from 'rollbar';
// eslint-disable-next-line import/no-extraneous-dependencies
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const rollbarConfig = {
  accessToken: process.env.ROLLBAR_ACCESS_TOKEN,
  environment: process.env.ROLLBAR_ENVIRONMENT || 'development',
  captureUncaught: true,
  captureUnhandledRejections: true,
  payload: {
    server: {
      root: process.cwd(),
    },
  },
};

const rollbar = new Rollbar(rollbarConfig);

// Enviar un mensaje de prueba cuando la aplicación inicia
rollbar.log('Rollbar initialized successfully');

export default rollbar;
