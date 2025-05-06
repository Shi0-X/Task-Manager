// server/models/TaskStatus.js
// @ts-check

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
        name: { type: 'string', minLength: 1 },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    };
  }
}