// Server-side column sorting for paginated lists (so sorting covers ALL pages, not just the visible one).
// Each route declares which columns are sortable and how a column's value is turned into a sort key.

// Text compares case-insensitively and digits compare numerically (RUN-10 after RUN-9).
const COLLATION = { locale: 'en', strength: 2, numericOrdering: true };

// Sort by a meaningful order instead of alphabetical, e.g. priority low < medium < high < critical.
function rank(field, order) {
  return {
    $switch: {
      branches: order.map((value, i) => ({ case: { $eq: [`$${field}`, value] }, then: i })),
      default: -1
    }
  };
}

// config: { column: [mongoExpr, ...] }  - several expressions = sort by the first, then the next.
// Returns { sort: null } when no sorting was requested, { error } when the request is invalid.
function parseSort(query, config) {
  const { sortBy, order } = query;
  if (!sortBy) return { sort: null };

  if (!Object.prototype.hasOwnProperty.call(config, sortBy)) {
    return { error: `sortBy must be one of: ${Object.keys(config).join(', ')}` };
  }
  const direction = String(order || 'asc').toLowerCase();
  if (direction !== 'asc' && direction !== 'desc') {
    return { error: "order must be 'asc' or 'desc'" };
  }
  return { sort: { keys: config[sortBy], dir: direction === 'asc' ? 1 : -1 } };
}

// Pipeline stages that compute the sort keys and sort. _id is the final tie-breaker so rows with
// equal values keep a stable order between pages. `cleanup` lists the temporary fields to $project away.
function sortStages(sort) {
  const addFields = {};
  const sortSpec = {};
  sort.keys.forEach((expr, i) => {
    addFields[`_sortKey${i}`] = expr;
    sortSpec[`_sortKey${i}`] = sort.dir;
  });
  sortSpec._id = 1;
  return { stages: [{ $addFields: addFields }, { $sort: sortSpec }], cleanup: Object.keys(addFields) };
}

module.exports = { COLLATION, rank, parseSort, sortStages };
