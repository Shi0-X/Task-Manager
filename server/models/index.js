// server/models/index.js - con depuración
// @ts-check

import User from './User.cjs';
import TaskStatus from './TaskStatus.js';
import Task from './Task.js';
import Label from './Label.js';

// Depuración de modelos registrados
console.log('Modelos registrados:');
console.log('User:', User ? 'Cargado' : 'No cargado');
console.log('TaskStatus:', TaskStatus ? 'Cargado' : 'No cargado');
console.log('Task:', Task ? 'Cargado' : 'No cargado');
console.log('Label:', Label ? 'Cargado' : 'No cargado');

export default [
  User,
  TaskStatus,
  Task,
  Label,
];
