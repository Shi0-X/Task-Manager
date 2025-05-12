// server/models/index.js (versión simplificada)
// @ts-check

import User from './User.cjs';
import TaskStatus from './TaskStatus.js';
import Task from './Task.js';

export default [
  User,
  TaskStatus,
  Task,
];