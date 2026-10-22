// Human-readable IDs (TC-0001, RUN-0001) used in URLs and the UI. The MongoDB _id is still accepted
// everywhere, so existing links, scripts and the MCP server keep working.

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

function formatId(prefix, n) {
  return `${prefix}-${String(n).padStart(4, '0')}`;
}

// Turns a URL param into a query filter: a 24-hex string is a Mongo _id, anything else is looked up
// by the readable ID field. Unknown formats simply match nothing (404) instead of throwing a cast error.
function idFilter(param, readableField) {
  const value = String(param || '');
  if (OBJECT_ID_RE.test(value)) return { _id: value };
  return { [readableField]: value.toUpperCase() };
}

module.exports = { formatId, idFilter };
