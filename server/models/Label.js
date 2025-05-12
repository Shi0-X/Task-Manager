// server/models/Label.js - versión corregida
// @ts-check

import { Model } from 'objection';
import BaseModel from './BaseModel.cjs';

export default class Label extends BaseModel {
  static get tableName() {
    return 'labels';
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

  static get columnNameMappers() {
    // Mapeo de columnas para asegurar compatibilidad con la base de datos
    return {
      parse(json) {
        const result = { ...json };
        
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
        
        if (result.createdAt !== undefined) {
          result.created_at = result.createdAt;
          delete result.createdAt;
        }
        
        if (result.updatedAt !== undefined) {
          result.updated_at = result.updatedAt;
          delete result.updatedAt;
        }
        
        return result;
      }
    };
  }

  static get relationMappings() {
    // Solución 1: Usar una referencia simple por nombre en lugar de importar
    return {
      tasks: {
        relation: Model.ManyToManyRelation,
        modelClass: 'Task', // Solo usar el nombre de la clase como string
        join: {
          from: 'labels.id',
          through: {
            from: 'tasks_labels.labelId',
            to: 'tasks_labels.taskId',
          },
          to: 'tasks.id',
        },
      },
    };
  }
}