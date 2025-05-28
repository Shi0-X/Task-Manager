// lib/normalizeMultiSelect.js
// @ts-check

import _ from 'lodash';

/**
 * Normaliza la entrada de un campo select múltiple (o único) a un array de números válidos.
 * La entrada puede ser undefined, null, un string, un número, o un array de strings/números.
 * Los strings vacíos, null, undefined y valores que resulten en NaN después de la conversión
 * son filtrados.
 *
 * Ejemplos:
 * normalizeMultiSelect(undefined)     // -> []
 * normalizeMultiSelect(null)          // -> []
 * normalizeMultiSelect('')            // -> []
 * normalizeMultiSelect('3')           // -> [3]
 * normalizeMultiSelect(['1', '2'])    // -> [1, 2]
 * normalizeMultiSelect(['1', '', '3']) // -> [1, 3]
 * normalizeMultiSelect(['1', 'abc'])  // -> [1]
 * normalizeMultiSelect('abc')         // -> []
 * normalizeMultiSelect(0)             // -> [0] (si 0 es un ID válido, si no, añadir .filter(id => id > 0))
 */
export default (value) => {
  if (_.isNil(value)) {
    return [];
  }

  return _.castArray(value) // 1. Asegura que 'value' sea un array
    .filter(id => id != null && id !== '') // 2. Filtra null, undefined y strings vacíos
    .map(id => Number(id)) // 3. Convierte a número
    .filter(id => !Number.isNaN(id)); // 4. Filtra cualquier NaN resultante
    // 5. Opcional: Si los IDs deben ser > 0, añade: .filter(id => id > 0)
};