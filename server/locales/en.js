// @ts-check

export default {
  translation: {
    appName: 'Task Manager',
    flash: {
      session: {
        create: {
          success: 'You are logged in',
          error: 'Incorrect email or password',
        },
        delete: {
          success: 'You are logged out',
        },
      },
      user: {
        create: {
          error: 'Failed to register',
          success: 'User registered successfully',
        },
        edit: {
          error: 'Failed to update user',
          success: 'User updated successfully',
        },
        delete: {
          error: 'Failed to delete user',
          success: 'User deleted successfully',
          hasTasks: 'User has associated tasks',
        },
        accessError: 'You cannot edit or delete another user',
      },
      statuses: {
        create: {
          error: 'Failed to create status',
          success: 'Status created successfully',
        },
        edit: {
          error: 'Failed to update status',
          success: 'Status updated successfully',
        },
        delete: {
          error: 'Failed to delete status',
          success: 'Status deleted successfully',
          hasTasks: 'Status is assigned to some tasks',
        },
      },
      task: {
        create: {
          error: 'Failed to create task',
          success: 'Task created successfully',
        },
        edit: {
          error: 'Failed to update task',
          success: 'Task updated successfully',
        },
        delete: {
          error: 'Only the author can delete the task',
          success: 'Task deleted successfully',
        },
        view: {
          error: 'Task not found',
        },
      },
      label: {
        create: {
          error: 'Failed to create label',
          success: 'Label created successfully',
        },
        edit: {
          error: 'Failed to update label',
          success: 'Label updated successfully',
        },
        delete: {
          error: 'Cannot delete label as it is assigned to tasks',
          success: 'Label deleted successfully',
        },
      },
      authError: 'Access denied! Please sign in.',
    },
    layouts: {
      application: {
        users: 'Users',
        signIn: 'Sign In',
        signUp: 'Sign Up',
        signOut: 'Sign Out',
        statuses: 'Statuses',
        labels: 'Labels',
        tasks: 'Tasks',
        home: 'Home',
      },
    },
    views: {
      session: {
        new: {
          signIn: 'Sign In',
          submit: 'Submit',
        },
      },
      user: {
        id: 'ID',
        email: 'Email',
        name: 'Full name',
        firstName: 'First name',
        lastName: 'Last name',
        password: 'Password',
        createdAt: 'Created at',
        new: {
          submit: 'Save',
          signUp: 'Sign Up',
        },
        edit: {
          title: 'Edit user',
          submit: 'Update',
        },
        delete: {
          submit: 'Delete',
        },
        actions: {
          header: 'Actions',
          edit: 'Edit',
          delete: 'Delete',
        },
      },
      taskStatus: {
        id: 'ID',
        name: 'Name',
        createdAt: 'Created at',
        actions: 'Actions',
        buttons: {
          new: 'Create status',
          edit: 'Edit',
          delete: 'Delete',
        },
        new: {
          submit: 'Create',
          creating: 'Create status',
          name: 'Name',
        },
        edit: {
          submit: 'Update',
          editing: 'Edit status',
          name: 'Name',
        },
      },
      label: {
        create: 'Create label',
        id: 'ID',
        name: 'Name',
        createdAt: 'Created at',
        actions: 'Actions',
        back: 'Back to labels',
        new: {
          title: 'Create label',
          submit: 'Create',
        },
        edit: {
          title: 'Edit label',
          submit: 'Update',
          link: 'Edit',
        },
        delete: {
          submit: 'Delete',
        },
      },
      task: {
        list: {
          title: 'Tasks',
        },
        create: 'Create task',
        id: 'ID',
        name: 'Name',
        description: 'Description',
        statusId: 'Status',
        status: 'Status',
        creatorId: 'Author',
        creator: 'Author',
        executorId: 'Executor',
        executor: 'Executor',
        labels: 'Labels',
        createdAt: 'Created at',
        actions: 'Actions',
        info: 'Task information',
        back: 'Back to tasks',
        select: {
          default: 'Select...',
        },
        new: {
          title: 'Create task',
          submit: 'Create',
        },
        edit: {
          title: 'Edit task',
          submit: 'Update',
          link: 'Edit',
        },
        delete: {
          submit: 'Delete',
        },
        filter: {
          status: 'Status',
          executor: 'Executor',
          label: 'Label',
          isCreatorUser: 'Only my tasks',
          submit: 'Show',
          reset: 'Reset Filter',
        },
      },
      welcome: {
        index: {
          hello: 'Hello from Hexlet!',
          description: 'Practical programming courses',
          more: 'Learn More',
        },
      },
    },
  },
};
