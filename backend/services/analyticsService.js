const TestRun = require('../models/TestRun');

// Headline stats for the dashboard cards
async function getSummary({ project }) {
  const filter = project ? { project } : {};

  const totalRuns = await TestRun.countDocuments(filter);
  const latest = await TestRun.findOne(filter).sort({ startedAt: -1 });

  const agg = await TestRun.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        avgDurationMs: { $avg: '$durationMs' },
        totalTestsRun: { $sum: '$totalTests' },
        totalPassed: { $sum: '$passedCount' },
        totalFailed: { $sum: '$failedCount' }
      }
    }
  ]);

  const stats = agg[0] || { avgDurationMs: 0, totalTestsRun: 0, totalPassed: 0, totalFailed: 0 };
  const overallPassRate = stats.totalTestsRun ? (stats.totalPassed / stats.totalTestsRun) * 100 : 0;

  return {
    totalRuns,
    latestRun: latest,
    avgDurationMs: Math.round(stats.avgDurationMs || 0),
    overallPassRate: Math.round(overallPassRate * 10) / 10
  };
}

// Pass rate per run over time, for the trend chart
async function getTrend({ project, limit = 30 }) {
  const filter = project ? { project } : {};

  const runs = await TestRun.find(filter)
    .sort({ startedAt: -1 })
    .limit(Number(limit))
    .select('startedAt totalTests passedCount failedCount skippedCount durationMs status');

  return runs
    .reverse()
    .map((r) => ({
      runId: r._id,
      startedAt: r.startedAt,
      passRate: r.totalTests ? Math.round((r.passedCount / r.totalTests) * 1000) / 10 : 0,
      durationMs: r.durationMs,
      status: r.status
    }));
}

// Tests that flip between passed/failed across recent runs.
// A test is "flaky" if, across the last N runs it appeared in, it has both
// passes and failures (rather than consistently passing or consistently failing).
async function getFlakyTests({ project, runWindow = 20 }) {
  const filter = project ? { project } : {};

  const recentRuns = await TestRun.find(filter)
    .sort({ startedAt: -1 })
    .limit(Number(runWindow))
    .select('testCases startedAt');

  const testHistory = {}; // name -> { passed, failed, skipped, total, lastSeen, statuses: [] }

  for (const run of recentRuns) {
    for (const tc of run.testCases) {
      if (!testHistory[tc.name]) {
        testHistory[tc.name] = { name: tc.name, suite: tc.suite, passed: 0, failed: 0, skipped: 0, total: 0, statuses: [] };
      }
      const entry = testHistory[tc.name];
      entry.total += 1;
      entry[tc.status] = (entry[tc.status] || 0) + 1;
      entry.statuses.push({ status: tc.status, startedAt: run.startedAt });
    }
  }

  return Object.values(testHistory)
    .filter((t) => t.passed > 0 && t.failed > 0)
    .map((t) => ({
      name: t.name,
      suite: t.suite,
      totalRuns: t.total,
      passed: t.passed,
      failed: t.failed,
      flakinessRate: Math.round((Math.min(t.passed, t.failed) / t.total) * 1000) / 10
    }))
    .sort((a, b) => b.flakinessRate - a.flakinessRate);
}

module.exports = { getSummary, getTrend, getFlakyTests };
