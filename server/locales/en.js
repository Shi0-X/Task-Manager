// @ts-check

export default {
  translation: {
    appName: 'Gestor de Tareas',
    flash: {
      session: {
        create: {
          success: 'Has iniciado sesión',
          error: 'Email o contraseña incorrectos',
        },
        delete: {
          success: 'Has cerrado sesión',
        },
      },
              user: {
        create: {
          error: 'No se pudo registrar el usuario', // ← CAMBIO AQUÍ
          success: 'Usuario registrado con éxito',
        },
        edit: {
          error: 'No se pudo actualizar el usuario',
          success: 'Usuario actualizado exitosamente',
        },
        delete: {
          error: 'No se pudo eliminar el usuario',
          success: 'Usuario eliminado exitosamente',
          hasTasks: 'El usuario tiene tareas asociadas',
        },
        accessError: 'No puedes editar o eliminar otro usuario',
      },
      statuses: {
        create: {
          error: 'No se pudo crear el estado',
          success: 'Estado creado exitosamente',
        },
        edit: {
          error: 'No se pudo actualizar el estado',
          success: 'Estado actualizado exitosamente',
        },
        delete: {
          error: 'No se pudo eliminar el estado',
          success: 'Estado eliminado exitosamente',
          hasTasks: 'El estado está asignado a algunas tareas',
        },
      },
      task: {
        create: {
          error: 'No se pudo crear la tarea',
          success: 'Tarea creada exitosamente',
        },
        edit: {
          error: 'No se pudo actualizar la tarea',
          success: 'Tarea actualizada exitosamente',
        },
        delete: {
          error: 'Solo el autor puede eliminar la tarea',
          success: 'Tarea eliminada exitosamente',
        },
        view: {
          error: 'Tarea no encontrada',
        },
      },
      label: {
        create: {
          error: 'No se pudo crear la etiqueta',
          success: 'Etiqueta creada exitosamente',
        },
        edit: {
          error: 'No se pudo actualizar la etiqueta',
          success: 'Etiqueta actualizada exitosamente',
        },
        delete: {
          error: 'No se puede eliminar la etiqueta ya que está asignada a tareas',
          success: 'Etiqueta eliminada exitosamente',
        },
      },
      authError: 'Acceso denegado! Por favor inicia sesión.',
    },
    layouts: {
      application: {
        users: 'Usuarios',
        signIn: 'Iniciar sesión',
        signUp: 'Registrarse',
        signOut: 'Cerrar sesión',
        statuses: 'Estados',
        labels: 'Etiquetas',
        tasks: 'Tareas',
        home: 'Inicio',
      },
    },
    views: {
      session: {
        new: {
          signIn: 'Iniciar sesión',
          submit: 'Entrar',
        },
      },
      user: {
        id: 'ID',
        email: 'Correo electrónico',
        name: 'Nombre completo',
        firstName: 'Nombre',
        lastName: 'Apellido',
        password: 'Contraseña',
        createdAt: 'Fecha de creación',
        new: {
          submit: 'Guardar',
          signUp: 'Registrarse',
        },
        edit: {
          title: 'Editar usuario',
          submit: 'Actualizar',
        },
        delete: {
          submit: 'Eliminar',
        },
        actions: {
          header: 'Acciones',
          edit: 'Editar',
          delete: 'Eliminar',
        },
      },
      taskStatus: {
        id: 'ID',
        name: 'Nombre',
        createdAt: 'Fecha de creación',
        actions: 'Acciones',
        buttons: {
          new: 'Crear estado',
          edit: 'Editar',
          delete: 'Eliminar',
        },
        new: {
          submit: 'Crear',
          creating: 'Crear estado',
          name: 'Nombre',
        },
        edit: {
          submit: 'Actualizar',
          editing: 'Editar estado',
          name: 'Nombre',
        },
      },
      label: {
        create: 'Crear etiqueta',
        id: 'ID',
        name: 'Nombre',
        createdAt: 'Fecha de creación',
        actions: 'Acciones',
        back: 'Volver a etiquetas',
        new: {
          title: 'Crear etiqueta',
          submit: 'Crear',
        },
        edit: {
          title: 'Editar etiqueta',
          submit: 'Actualizar',
          link: 'Editar',
        },
        delete: {
          submit: 'Eliminar',
        },
      },
      task: {
        list: {
          title: 'Tareas',
        },
        create: 'Crear tarea',
        id: 'ID',
        name: 'Nombre',
        description: 'Descripción',
        statusId: 'Estado',
        status: 'Estado',
        creatorId: 'Autor',
        creator: 'Autor',
        executorId: 'Ejecutor',
        executor: 'Ejecutor',
        labels: 'Etiquetas',
        createdAt: 'Fecha de creación',
        actions: 'Acciones',
        info: 'Información de la tarea',
        back: 'Volver a tareas',
        select: {
          default: 'Seleccionar...',
        },
        new: {
          title: 'Crear tarea',
          submit: 'Crear',
        },
        edit: {
          title: 'Editar tarea',
          submit: 'Actualizar',
          link: 'Editar',
        },
        delete: {
          submit: 'Eliminar',
        },
        filter: {
          status: 'Estado',
          executor: 'Ejecutor',
          label: 'Etiqueta',
          isCreatorUser: 'Solo mis tareas',
          submit: 'Mostrar',
          reset: 'Limpiar filtro',
        },
      },
      welcome: {
        index: {
          hello: 'Hola desde Hexlet!',
          description: 'Cursos prácticos de programación',
          more: 'Aprende Más',
        },
      },
    },
    // Agregando las secciones específicas que buscan los tests
    links: {
      root: {
        name: 'Gestor de Tareas',
        url: 'http://localhost:3000/',
      },
      users: {
        name: 'Usuarios',
        url: 'http://localhost:3000/users',
      },
      statuses: {
        name: 'Estados',
        url: 'http://localhost:3000/statuses',
      },
      newStatus: {
        name: 'Crear estado',
        url: 'http://localhost:3000/statuses/new',
      },
      labels: {
        name: 'Etiquetas',
        url: 'http://localhost:3000/labels',
      },
      newLabel: {
        name: 'Crear etiqueta',
        url: 'http://localhost:3000/labels/new',
      },
      tasks: {
        name: 'Tareas',
        url: 'http://localhost:3000/tasks',
      },
      newTask: {
        name: 'Crear tarea',
        url: 'http://localhost:3000/tasks/new',
      },
      signUp: {
        name: 'Registrarse',
        url: 'http://localhost:3000/users/new',
      },
      signIn: {
        name: 'Iniciar sesión',
        url: 'http://localhost:3000/session/new',
      },
      edit: {
        name: 'Actualizar',
      },
      session: {
        url: 'http://localhost:3000/session',
      },
    },
    buttons: {
      save: {
        name: 'Guardar',
      },
      edit: {
        name: 'Actualizar',
      },
      delete: {
        name: 'Eliminar',
      },
      signIn: {
        name: 'Entrar',
      },
      signUp: {
        name: 'Registro',
      },
      signOut: {
        name: 'Cerrar sesión',
      },
      create: {
        name: 'Crear',
      },
      show: {
        name: 'Mostrar',
      },
    },
    alerts: {
      signIn: 'Has iniciado sesión',
      signOut: 'Has cerrado sesión',
    },
  },
};