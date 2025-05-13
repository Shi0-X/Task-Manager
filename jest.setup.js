// @ts-check

// Definir setImmediate que falta en el entorno de prueba
if (typeof setImmediate === 'undefined') {
  global.setImmediate = (callback, ...args) => setTimeout(callback, 0, ...args);
}

// Definir clearImmediate si es necesario
if (typeof clearImmediate === 'undefined') {
  global.clearImmediate = (id) => clearTimeout(id);
}

// Asegurarse de que SQLITE_MEMORY está configurado
process.env.SQLITE_MEMORY = 'true';
