// migrations/20250429000001_rename_columns_to_snake_case.js

export const up = async (knex) => {
    // Verificamos si existe la tabla
    const hasTable = await knex.schema.hasTable('users');
    if (!hasTable) return Promise.resolve();
  
    // Verificamos si existen las columnas en camelCase
    const columns = await knex('users').columnInfo();
    const columnNames = Object.keys(columns);
    
    // Si tiene firstName pero no first_name, necesitamos hacer la migración
    if (columnNames.includes('firstName') && !columnNames.includes('first_name')) {
      await knex.schema.alterTable('users', (table) => {
        // Añadimos las nuevas columnas
        table.string('first_name');
        table.string('last_name');
      });
      
      // Copiamos los datos de las columnas viejas a las nuevas
      await knex.raw('UPDATE users SET first_name = firstName, last_name = lastName');
      
      // Eliminamos las columnas viejas
      await knex.schema.alterTable('users', (table) => {
        table.dropColumn('firstName');
        table.dropColumn('lastName');
      });
    }
  };
  
  export const down = async (knex) => {
    // No hacemos nada en el down para evitar perder datos
    return Promise.resolve();
  };