// locales/en.js
// @ts-check

export default {
  translation: {
    appName: 'Fastify Boilerplate',

    flash: {
      session: {
        create: {
          success: 'You are logged in',
          error: 'Wrong email or password',
        },
        delete: {
          success: 'You are logged out',
        },
      },
      users: {
        create: {
          success: 'User registered successfully',
          error: 'Failed to register',
        },
        edit: {
          success: 'User updated successfully',
          error: 'Failed to update user',
        },
        delete: {
          success: 'User deleted successfully',
        },
        notFound: 'User not found',
        authorization: {
          error: 'You can only edit or delete your own account'
        }
      },
      authError: 'Access denied! Please login',
    },

    layouts: {
      application: {
        users: 'Users',
        signIn: 'Login',
        signUp: 'Register',
        signOut: 'Logout',
        home: 'Home',
        menu: 'Menu',
      },
    },

    views: {
      welcome: {
        index: {
          hello: 'Hello from Hexlet!',
          description: 'Online programming school',
          more: 'Learn more',
        },
      },

      session: {
        new: {
          signIn: 'Login',
          submit: 'Login',
        },
      },

      users: {
        id: 'ID',
        firstName: 'First Name',
        lastName: 'Last Name',
        email: 'Email',
        createdAt: 'Created at',

        new: {
          signUp: 'Register',
          submit: 'Register',
        },

        edit: {
          title: 'Edit user',
          submit: 'Update',
        },

        actions: {
          header: 'Actions',
          edit: 'Edit',
          delete: 'Delete',
        },

        fields: {
          firstName: 'First name',
          lastName:  'Last name',
          email:     'Email',
          password:  'Password',
        },
      },
    },
  },
};