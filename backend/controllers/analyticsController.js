const analyticsService = require('../services/analyticsService');
const { sendError } = require('../utils/httpErrors');

// GET /api/analytics/summary
async function summary(req, res) {
  try {
    const result = await analyticsService.getSummary({ project: req.query.project });
    res.json(result);
  } catch (err) {
    sendError(res, err, 'Failed to compute summary');
  }
}

// GET /api/analytics/trend
async function trend(req, res) {
  try {
    const result = await analyticsService.getTrend({ project: req.query.project, limit: req.query.limit });
    res.json(result);
  } catch (err) {
    sendError(res, err, 'Failed to compute trend');
  }
}

// GET /api/analytics/flaky
async function flaky(req, res) {
  try {
    const result = await analyticsService.getFlakyTests({ project: req.query.project, runWindow: req.query.runWindow });
    res.json(result);
  } catch (err) {
    sendError(res, err, 'Failed to compute flaky tests');
  }
}

module.exports = { summary, trend, flaky };
