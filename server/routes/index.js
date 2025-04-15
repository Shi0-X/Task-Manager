// @ts-check

import welcome from './welcome.js';
import users from './users.js';
import sessions from './session.js'; // Asegúrate de que el nombre del archivo sea "session.js"

const controllers = [welcome, users, sessions];

export default (app) => controllers.forEach((controller) => controller(app));
