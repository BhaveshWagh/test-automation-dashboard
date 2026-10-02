const express = require('express');
const router = express.Router();
const TestRun = require('../models/TestRun');

// POST /api/runs - ingest a new test run
// Body shape matches what a CI job or the seed script would send:
// { project, branch, triggeredBy, framework, startedAt, finishedAt, testCases: [{name, suite, status, durationMs, errorMessage, retries}] }
router.post('/', async (req, res) => {
  try {
    const { testCases = [], startedAt, finishedAt } = req.body;

    if (!testCases.length) {
      return res.status(400).json({ error: 'testCases array is required and cannot be empty' });
    }

    const passedCount = testCases.filter((t) => t.status === 'passed').length;
    const failedCount = testCases.filter((t) => t.status === 'failed').length;
    const skippedCount = testCases.filter((t) => t.status === 'skipped').length;

    let status = 'passed';
    if (failedCount > 0) status = failedCount === testCases.length ? 'failed' : 'mixed';

    const run = new TestRun({
      ...req.body,
      totalTests: testCases.length,
      passedCount,
      failedCount,
      skippedCount,
      status,
      durationMs: new Date(finishedAt) - new Date(startedAt)
    });

    await run.save();
    res.status(201).json(run);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save test run', details: err.message });
  }
});

// GET /api/runs - list runs, most recent first (paginated)
router.get('/', async (req, res) => {
  try {
    const { limit = 20, page = 1, project } = req.query;
    const filter = project ? { project } : {};
    const runs = await TestRun.find(filter)
      .sort({ startedAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select('-testCases'); // omit heavy array in list view

    const total = await TestRun.countDocuments(filter);
    res.json({ runs, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch runs', details: err.message });
  }
});

// GET /api/runs/:id - full detail of one run, including all test cases
router.get('/:id', async (req, res) => {
  try {
    const run = await TestRun.findById(req.params.id);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch run', details: err.message });
  }
});

module.exports = router;
