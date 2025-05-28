// server/models/TaskStatus.js
// @ts-check

import { Model } from 'objection';
import BaseModel from './BaseModel.cjs';

export default class TaskStatus extends BaseModel {
  static get tableName() {
    return 'statuses';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name'],
      properties: {
        id: { type: 'integer' },
        name: { 
          type: 'string', 
          minLength: 1
        },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
      additionalProperties: false,
    };
  }

  // Las relaciones deben definirse de manera que eviten dependencias circulares
  static get relationMappings() {
    // Definimos las relaciones dentro de la función para cargar Task dinámicamente
    return {
      tasks: {
        relation: Model.HasManyRelation,
        // Referenciamos al nombre de la clase en lugar de importar
        modelClass: 'Task',
        join: {
          from: 'statuses.id',
          to: 'tasks.statusId',
        },
      },
    };
  }
}