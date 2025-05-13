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
      required: ['name', 'statusId', 'creatorId'],
      properties: {
        id: { type: 'integer' },
        name: { type: 'string', minLength: 1 },
        description: { type: 'string' },
        statusId: { type: 'integer' },
        creatorId: { type: 'integer' },
        executorId: { type: ['integer', 'null'] },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    };
  }

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
    return {
      status: {
        relation: Model.BelongsToOneRelation,
        modelClass: TaskStatus,
        join: {
          from: 'tasks.statusId',
          to: 'statuses.id',
        },
      },
      creator: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'tasks.creatorId',
          to: 'users.id',
        },
      },
      executor: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'tasks.executorId',
          to: 'users.id',
        },
      },
      // NUEVA RELACIÓN: Muchos a muchos con etiquetas
      labels: {
        relation: Model.ManyToManyRelation,
        modelClass: Label,
        join: {
          from: 'tasks.id',
          through: {
            from: 'tasks_labels.taskId',
            to: 'tasks_labels.labelId',
          },
          to: 'labels.id',
        },
      },
    };
  }
}
