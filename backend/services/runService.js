const TestRun = require('../models/TestRun');
const Counter = require('../models/Counter');
const { formatId, idFilter } = require('../utils/ids');
const { COLLATION, rank, parseSort, sortStages } = require('../utils/sortQuery');
const { AppError } = require('../utils/httpErrors');

// Columns the Runs table can sort by. Status sorts by severity (passed < mixed < failed), not alphabetically.
const SORTABLE_COLUMNS = {
  runId: ['$runId'],
  startedAt: ['$startedAt'],
  branch: ['$branch'],
  framework: ['$framework'],
  status: [rank('status', ['passed', 'mixed', 'failed'])],
  totalTests: ['$totalTests'],
  passedCount: ['$passedCount', '$failedCount']
};

// Body shape matches what a CI job or the seed script would send:
// { project, branch, triggeredBy, framework, startedAt, finishedAt, testCases: [{name, suite, status, durationMs, errorMessage, retries}] }
async function ingestRun(payload) {
  const { testCases = [], startedAt, finishedAt } = payload;

  if (!testCases.length) {
    throw new AppError(400, 'testCases array is required and cannot be empty');
  }

  const passedCount = testCases.filter((t) => t.status === 'passed').length;
  const failedCount = testCases.filter((t) => t.status === 'failed').length;
  const skippedCount = testCases.filter((t) => t.status === 'skipped').length;

  let status = 'passed';
  if (failedCount > 0) status = failedCount === testCases.length ? 'failed' : 'mixed';

  // Atomic counter: simultaneous ingests can never receive the same run ID.
  const runId = formatId('RUN', await Counter.reserve('run', 1));

  const run = new TestRun({
    ...payload,
    runId,
    totalTests: testCases.length,
    passedCount,
    failedCount,
    skippedCount,
    status,
    durationMs: new Date(finishedAt) - new Date(startedAt)
  });

  await run.save();
  return run;
}

async function listRuns({ query, page, limit }) {
  const filter = query.project ? { project: query.project } : {};

  const { sort, error } = parseSort(query, SORTABLE_COLUMNS);
  if (error) throw new AppError(400, error);

  let runs;
  if (sort) {
    const { stages, cleanup } = sortStages(sort);
    runs = await TestRun.aggregate([
      { $match: filter },
      ...stages,
      { $skip: (page - 1) * Number(limit) },
      { $limit: Number(limit) },
      { $project: { testCases: 0, ...Object.fromEntries(cleanup.map((k) => [k, 0])) } } // omit heavy array in list view
    ]).collation(COLLATION);
  } else {
    runs = await TestRun.find(filter)
      .sort({ startedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select('-testCases'); // omit heavy array in list view
  }

  const total = await TestRun.countDocuments(filter);
  return { runs, total };
}

async function getRunById(id) {
  const run = await TestRun.findOne(idFilter(id, 'runId'));
  if (!run) throw new AppError(404, 'Run not found');
  return run;
}

module.exports = { ingestRun, listRuns, getRunById };
