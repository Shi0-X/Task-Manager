// server/helpers/index.js
// @ts-check

import i18next from 'i18next';
import _ from 'lodash';

export default () => ({
  route(name) {
    const map = {
      root: '/',
      users: '/users',
      newUser: '/users/new',
      newSession: '/session/new',
      session: '/session',
      sessionDelete: '/session', // se usará método DELETE
    };
    return map[name] || '#';
  },
  t(key) {
    return i18next.t(key);
  },
  _,
  getAlertClass(type) {
    switch (type) {
      case 'error': return 'danger';
      case 'success': return 'success';
      case 'info': return 'info';
      default: throw new Error(`Unknown flash type: '${type}'`);
    }
  },
  formatDate(str) {
    const date = new Date(str);
    return date.toLocaleString();
  },
});
