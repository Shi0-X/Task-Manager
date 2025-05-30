// @ts-check

export default (app) => {
  app
    .get('/', { name: 'root' }, async (req, reply) => {
      let tasksAssigned = 0;
      let tasksCreated = 0;
      let statusCounts = [];

      // Solo obtener estadísticas si el usuario está autenticado
      if (req.isAuthenticated()) {
        try {
          // Contar tareas asignadas al usuario actual
          const assignedResult = await app.objection.models.task.query()
            .where('executorId', req.user.id)
            .count('id as count');
          tasksAssigned = parseInt(assignedResult[0].count, 10);

          // Contar tareas creadas por el usuario actual
          const createdResult = await app.objection.models.task.query()
            .where('creatorId', req.user.id)
            .count('id as count');
          tasksCreated = parseInt(createdResult[0].count, 10);

          // Primero obtener todos los estados
          const allStatuses = await app.objection.models.taskStatus.query()
            .select('id', 'name')
            .orderBy('name');

          // Luego obtener los conteos de tareas por estado
          const taskCounts = await app.objection.models.task.query()
            .select('statusId')
            .count('id as count')
            .groupBy('statusId');

          // Crear un mapa para buscar rápidamente los conteos
          const countMap = {};
          taskCounts.forEach((item) => {
            countMap[item.statusId] = parseInt(item.count, 10);
          });

          // Combinar los resultados
          statusCounts = allStatuses.map((status) => ({
            id: status.id,
            name: status.name,
            count: countMap[status.id] || 0,
          }));
        } catch (err) {
          console.error('Error al obtener estadísticas:', err);
          // Registrar el error en Rollbar
          app.rollbar.error(err, req);
        }
      }

      return reply.render('welcome/index', {
        tasksAssigned,
        tasksCreated,
        statusCounts,
      });
    })
    .get(
      '/protected',
      { name: 'protected', preValidation: app.authenticate },
      // eslint-disable-next-line no-unused-vars
      (_req, _reply) => {
        _reply.render('welcome/index');
      },
    );
};
