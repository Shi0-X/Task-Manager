// server/models/Task.js
// @ts-check

import { Model } from 'objection';
import BaseModel from './BaseModel.cjs';

// Importaciones al final para evitar dependencias circulares
import TaskStatus from './TaskStatus.js';
import User from './User.cjs';
import Label from './Label.js';

export default class Task extends BaseModel {
  static get tableName() {
    return 'tasks';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'statusId', 'creatorId'], // creatorId se asigna en el backend, así que no viene del form.
      properties: {
        id: { type: 'integer' },
        name: { type: 'string', minLength: 1 },
        description: { type: 'string' }, // Podrías añadir minLength: 1 si es requerido, o quitarlo de la validación manual en la ruta si no lo es.
        statusId: { type: 'integer' }, // Objection manejará la conversión de string a integer si es posible.
        creatorId: { type: 'integer' },
        executorId: { type: ['integer', 'null'] }, // Correcto para opcional
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
      additionalProperties: false, // Buena práctica
    };
  }

  // ... (columnNameMappers y relationMappings se mantienen igual)
  static get columnNameMappers() {
    return {
      parse(json) {
        const result = { ...json };
        if (result.status_id !== undefined) {
          result.statusId = result.status_id;
          delete result.status_id;
        }
        if (result.creator_id !== undefined) {
          result.creatorId = result.creator_id;
          delete result.creator_id;
        }
        if (result.executor_id !== undefined) {
          result.executorId = result.executor_id;
          delete result.executor_id;
        }
        if (result.created_at !== undefined) {
          result.createdAt = result.created_at;
          delete result.created_at;
        }
        if (result.updated_at !== undefined) {
          result.updatedAt = result.updated_at;
          delete result.updated_at;
        }
        return result;
      },
      format(json) {
        const result = { ...json };
        if (result.statusId !== undefined) {
          result.status_id = result.statusId;
          delete result.statusId;
        }
        if (result.creatorId !== undefined) {
          result.creator_id = result.creatorId;
          delete result.creatorId;
        }
        if (result.executorId !== undefined) {
          result.executor_id = result.executorId;
          delete result.executorId;
        }
        if (result.createdAt !== undefined) {
          result.created_at = result.createdAt;
          delete result.createdAt;
        }
        if (result.updatedAt !== undefined) {
          result.updated_at = result.updatedAt;
          delete result.updatedAt;
        }
        return result;
      },
    };
  }

  static get relationMappings() {
    // Asegúrate de que las importaciones de modelos estén definidas antes de este bloque o usa strings
    // const TaskStatus = require('./TaskStatus.js').default; // Ejemplo si se define tarde
    // const User = require('./User.cjs').default;
    // const Label = require('./Label.js').default;

    return {
      status: {
        relation: Model.BelongsToOneRelation,
        modelClass: TaskStatus, // o 'TaskStatus' si hay importación circular
        join: {
          from: 'tasks.statusId',
          to: 'statuses.id',
        },
      },
      creator: {
        relation: Model.BelongsToOneRelation,
        modelClass: User, // o 'User'
        join: {
          from: 'tasks.creatorId',
          to: 'users.id',
        },
      },
      executor: {
        relation: Model.BelongsToOneRelation,
        modelClass: User, // o 'User'
        join: {
          from: 'tasks.executorId',
          to: 'users.id',
        },
      },
      labels: {
        relation: Model.ManyToManyRelation,
        modelClass: Label, // o 'Label'
        join: {
          from: 'tasks.id',
          through: {
            from: 'tasks_labels.task_id',
            to: 'tasks_labels.label_id',
          },
          to: 'labels.id',
        },
      },
    };
  }
}