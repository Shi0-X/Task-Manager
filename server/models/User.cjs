// server/models/User.cjs
const BaseModel = require('./BaseModel.cjs');
const objectionUnique = require('objection-unique');
const encrypt = require('../lib/secure.cjs');
const { Model } = require('objection');

const unique = objectionUnique({ fields: ['email'] });

module.exports = class User extends unique(BaseModel) {
  static get tableName() {
    return 'users';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['firstName', 'lastName', 'email', 'password'],
      properties: {
        id:             { type: 'integer' },
        firstName:      { type: 'string', minLength: 1 },
        lastName:       { type: 'string', minLength: 1 },
        email:          { 
          type: 'string', 
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        },
        password:       { type: 'string', minLength: 3 },
        passwordDigest: { type: 'string' }
      },
      additionalProperties: false,
    };
  }

  // El mapeo explícito de nombres de columnas
  static get columnNameMappers() {
    return {
      parse(json) {
        const result = { ...json };
        
        // Convertimos snake_case a camelCase al leer de la BD
        if (result.first_name !== undefined) {
          result.firstName = result.first_name;
          delete result.first_name;
        }
        
        if (result.last_name !== undefined) {
          result.lastName = result.last_name;
          delete result.last_name;
        }
        
        if (result.password_digest !== undefined) {
          result.passwordDigest = result.password_digest;
          delete result.password_digest;
        }
        
        return result;
      },
      
      format(json) {
        const result = { ...json };
        
        // Convertimos camelCase a snake_case al escribir a la BD
        if (result.firstName !== undefined) {
          result.first_name = result.firstName;
          delete result.firstName;
        }
        
        if (result.lastName !== undefined) {
          result.last_name = result.lastName;
          delete result.lastName;
        }
        
        if (result.passwordDigest !== undefined) {
          result.password_digest = result.passwordDigest;
          delete result.passwordDigest;
        }
        
        return result;
      }
    };
  }

  set password(value) {
    this.passwordDigest = encrypt(value);
  }

  verifyPassword(password) {
    return encrypt(password) === this.passwordDigest;
  }

  // Las relaciones con tareas se definen de manera simple sin importar Task directamente
  static get relationMappings() {
    return {
      createdTasks: {
        relation: Model.HasManyRelation,
        modelClass: 'Task',
        join: {
          from: 'users.id',
          to: 'tasks.creatorId',
        },
      },
      
      assignedTasks: {
        relation: Model.HasManyRelation,
        modelClass: 'Task',
        join: {
          from: 'users.id',
          to: 'tasks.executorId',
        },
      },
    };
  }
};