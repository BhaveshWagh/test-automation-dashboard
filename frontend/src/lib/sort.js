// Client-side sorting for tables whose data is already fully loaded in the browser.

// Compares two values by their type: numbers numerically, dates by time, text case-insensitively with
// digits compared as numbers (RUN-9 before RUN-10). Empty values always sort last, in either direction.
function compareValues(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

const isEmpty = (v) => v === null || v === undefined || v === '' || (typeof v === 'number' && Number.isNaN(v));

// accessors: { column: (row) => sortableValue }. Return a number for ranked or numeric data
// (e.g. status severity, duration) and a string for text. Dates should be returned as timestamps.
export function sortRows(rows, sort, accessors) {
  if (!sort || !accessors[sort.field]) return rows;
  const get = accessors[sort.field];
  const dir = sort.order === 'desc' ? -1 : 1;

  return rows
    .map((row, index) => ({ row, index, value: get(row) }))
    .sort((x, y) => {
      const xe = isEmpty(x.value);
      const ye = isEmpty(y.value);
      if (xe || ye) return xe && ye ? x.index - y.index : xe ? 1 : -1; // empty last, ignoring direction
      const result = compareValues(x.value, y.value) * dir;
      return result || x.index - y.index; // stable
    })
    .map((entry) => entry.row);
}

// Ranked orders so columns sort by meaning instead of alphabetically.
export const RUN_STATUS_RANK = { passed: 0, mixed: 1, failed: 2 };
export const RESULT_STATUS_RANK = { passed: 0, skipped: 1, failed: 2 };
