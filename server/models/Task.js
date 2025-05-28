// server/models/Task.js
// @ts-check

import BaseModel from './BaseModel.cjs'; // Asumiendo que BaseModel.cjs está en la misma carpeta

// Es importante que las clases de modelo se importen o se definan antes de ser usadas en relationMappings
// Si hay problemas de importación circular, usar strings como 'User', 'TaskStatus', 'Label' es más seguro.
// O asegurarnos de que la importación se resuelva. Para este ejemplo, usaré strings.

export default class Task extends BaseModel {
  static get tableName() {
    return 'tasks';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'statusId', 'creatorId'], // creatorId se asigna en el backend.
      properties: {
        id: { type: 'integer' },
        name: { type: 'string', minLength: 1 },
        statusId: { type: 'integer', minimum: 1 }, // Asegurar que sea un ID válido
        creatorId: { type: 'integer', minimum: 1 }, // Asegurar que sea un ID válido
        executorId: { type: ['integer', 'null'], minimum: 1 }, // Si es integer, debe ser válido
        description: { type: 'string' }, // Puede ser nulo o vacío si es opcional
        // timestamps son manejados por BaseModel o la DB
      },
    };
  }

  static get relationMappings() {
    // Para evitar errores de "modelClass is not defined", es más seguro usar strings
    // y que Objection las resuelva, o asegurarse de que las importaciones estén disponibles.
    // Por ejemplo: const User = require('./User.cjs').default; etc.
    return {
      creator: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: 'User', // String para evitar problemas de carga circular
        join: {
          from: 'tasks.creatorId',
          to: 'users.id',
        },
      },
      executor: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: 'User', // String
        join: {
          from: 'tasks.executorId',
          to: 'users.id',
        },
      },
      status: {
        relation: BaseModel.BelongsToOneRelation,
        modelClass: 'TaskStatus', // String
        join: {
          from: 'tasks.statusId',
          to: 'statuses.id',
        },
      },
      labels: {
        relation: BaseModel.ManyToManyRelation,
        modelClass: 'Label', // String
        join: {
          from: 'tasks.id',
          through: {
            // Asumiendo nombres de columna snake_case en la tabla de unión
            from: 'tasks_labels.task_id',
            to: 'tasks_labels.label_id',
          },
          to: 'labels.id',
        },
      },
    };
  }

  static get modifiers() {
    return {
      sortByLatestCreatedDate(query) {
        // Asumiendo que la columna se llama 'created_at' o como esté definida en tu BaseModel/DB
        query.orderBy('createdAt', 'desc'); // O 'created_at' si tu columnNameMappers no lo maneja
      },

      filterByStatus(query, statusId) {
        const numStatusId = Number(statusId);
        if (!Number.isNaN(numStatusId) && numStatusId > 0) {
          query.where('statusId', numStatusId);
        }
      },

      filterByExecutor(query, executorId) {
        const numExecutorId = Number(executorId);
        if (!Number.isNaN(numExecutorId) && numExecutorId > 0) {
          query.where('executorId', numExecutorId);
        } else if (executorId === null || executorId === '') { // Para permitir filtrar por "sin ejecutor" si se pasa null/vacío
          // Esto depende de si el formulario puede enviar un valor para "sin ejecutor"
          // Por ahora, solo filtra si hay un ID numérico.
        }
      },

      filterByLabel(query, labelId) {
        const numericLabelId = Number(labelId);
        if (!Number.isNaN(numericLabelId) && numericLabelId > 0) {
          query.whereExists(
            // 'this' se refiere a la clase Task
            this.relatedQuery('labels').where('labels.id', numericLabelId)
          );
        }
      },

      filterByCreator(query, creatorId) {
        // creatorId ya debería ser un número (viene de req.user.id)
        query.where('creatorId', Number(creatorId));
      },
    };
  }
}