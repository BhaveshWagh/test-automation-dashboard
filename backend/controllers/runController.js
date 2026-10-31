const runService = require('../services/runService');
const { sendError } = require('../utils/httpErrors');

// POST /api/runs - ingest a new test run
async function create(req, res) {
  try {
    const run = await runService.ingestRun(req.body);
    res.status(201).json(run);
  } catch (err) {
    sendError(res, err, 'Failed to save test run');
  }
}

// GET /api/runs - list runs, most recent first (paginated)
async function list(req, res) {
  try {
    const { limit = 20, page = 1 } = req.query;
    const { runs, total } = await runService.listRuns({ query: req.query, page, limit });
    res.json({ runs, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    sendError(res, err, 'Failed to fetch runs');
  }
}

// GET /api/runs/:id - full detail of one run, including all test cases. :id is a run ID (RUN-0001) or a Mongo _id.
async function getOne(req, res) {
  try {
    const run = await runService.getRunById(req.params.id);
    res.json(run);
  } catch (err) {
    sendError(res, err, 'Failed to fetch run');
  }
}

module.exports = { create, list, getOne };
