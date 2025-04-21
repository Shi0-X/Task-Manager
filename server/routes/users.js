// server/routes/users.js
// @ts-check

import i18next from 'i18next';

export default (app) => {
  // 1) Listado de usuarios
  app.get(
    '/users',
    { name: 'users' },
    async (req, reply) => {
      // Para depurar: ¿está Passport reconociendo tu sesión?
      console.log('→ isAuthenticated on GET /users:', req.isAuthenticated());

      const users = await app.objection.models.user.query();
      // Usa reply.render para que se inyecten flash() e isAuthenticated()
      return reply.render('users/index', { users });
    }
  );

  // 2) Formulario de registro
  app.get(
    '/users/new',
    { name: 'newUser' },
    (req, reply) => {
      const user = new app.objection.models.user();
      return reply.render('users/new', { user });
    }
  );

  // 3) Procesar el registro
  app.post(
    '/users',
    async (req, reply) => {
      console.log('👉 POST /users body:', req.body);

      const user = new app.objection.models.user();
      user.$set(req.body.data);

      try {
        const validUser = await app.objection.models.user.fromJson(req.body.data);
        console.log('✅ Datos validados:', validUser);

        const inserted = await app.objection.models.user.query().insert(validUser);
        console.log('🆕 Usuario insertado:', inserted);

        // Al registrar correctamente, redirige a la lista
        return reply.redirect('/users');
      } catch (err) {
        // Si viene deJson con { data }, desempaqueta errores de validación
        if (err.data) {
          console.error('❌ Errores de validación:', err.data);
          return reply.render('users/new', { user, errors: err.data });
        }
        // Cualquier otro error, lánzalo para que el logger lo muestre
        throw err;
      }
    }
  );

  // 4) (Más adelante) GET /users/:id/edit, PATCH y DELETE…
};
