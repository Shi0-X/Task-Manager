// @ts-check

export default {
  translation: {
    appName: 'Task Manager',
    menu: {
      login: 'Login',
      register: 'Register',
      users: 'Users'
    },
    welcome: {
      heading: 'Welcome to Task Manager',
      description: 'Manage your tasks efficiently and collaboratively!'
    },
    flash: {
      session: {
        create: {
          success: 'You are logged in',
          error: 'Wrong email or password'
        },
        delete: {
          success: 'You are logged out'
        }
      },
      users: {
        create: {
          error: 'Failed to register',
          success: 'User registered successfully'
        }
      },
      authError: 'Access denied! Please login'
    },
    layouts: {
      application: {
        menu: 'Menu',
        home: 'Home',
        users: 'Users',
        signIn: 'Login',
        signUp: 'Register',
        signOut: 'Logout'
      }
    },
    views: {
      session: {
        new: {
          signIn: 'Login',
          submit: 'Login'
        }
      },
      users: {
        id: 'ID',
        email: 'Email',
        createdAt: 'Created at',
        new: {
          submit: 'Register',
          signUp: 'Register'
        }
      },
      welcome: {
        index: {
          hello: 'Welcome!',
          header: 'Welcome to Task Manager',
          description: 'Manage your tasks efficiently and collaboratively!',
          more: 'Learn more'
        }
      }
    }
  }
};
