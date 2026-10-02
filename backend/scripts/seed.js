/**
 * Seed script: generates realistic-looking historical test run data so the
 * dashboard has something meaningful to show without needing a real CI
 * pipeline wired up yet.
 *
 * Usage: npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const TestRun = require('../models/TestRun');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test_automation_dashboard';

const SUITES = {
  auth: ['login with valid credentials', 'login with invalid password', 'logout clears session', 'password reset flow', 'signup with existing email is rejected'],
  checkout: ['add item to cart', 'apply valid coupon code', 'apply expired coupon code', 'checkout with saved card', 'checkout total matches line items'],
  search: ['search returns relevant results', 'search with no results shows empty state', 'filter by category', 'sort by price ascending', 'pagination loads next page'],
  profile: ['update display name', 'upload avatar image', 'change email requires verification', 'delete account requires confirmation'],
  api: ['GET /users returns paginated list', 'POST /orders validates payload', 'rate limiting returns 429 after threshold', 'auth token refresh works']
};

// Tests that intentionally flip between pass/fail across runs (simulating flakiness)
const FLAKY_TESTS = new Set([
  'upload avatar image',
  'rate limiting returns 429 after threshold',
  'checkout with saved card',
  'pagination loads next page'
]);

// A test that's been consistently broken for a while (regression, not flaky)
const BROKEN_TESTS = new Set(['delete account requires confirmation']);

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildTestCases() {
  const cases = [];
  for (const [suite, names] of Object.entries(SUITES)) {
    for (const name of names) {
      let status = 'passed';
      if (BROKEN_TESTS.has(name)) {
        status = Math.random() < 0.9 ? 'failed' : 'passed'; // mostly broken
      } else if (FLAKY_TESTS.has(name)) {
        status = Math.random() < 0.35 ? 'failed' : 'passed'; // flips often
      } else {
        status = Math.random() < 0.03 ? 'failed' : 'passed'; // rare, incidental failure
      }

      cases.push({
        name,
        suite,
        status,
        durationMs: randomBetween(80, 4000),
        errorMessage: status === 'failed' ? `AssertionError: expected element to be visible in "${name}"` : null,
        retries: status === 'failed' ? randomBetween(0, 2) : 0
      });
    }
  }
  return cases;
}

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB, clearing existing runs...');
  await TestRun.deleteMany({});

  const NUM_RUNS = 40;
  const now = Date.now();
  const runs = [];

  for (let i = NUM_RUNS - 1; i >= 0; i--) {
    // Spread runs roughly every 12-18 hours going back in time
    const startedAt = new Date(now - i * randomBetween(12, 18) * 60 * 60 * 1000);
    const testCases = buildTestCases();
    const durationMs = testCases.reduce((sum, t) => sum + t.durationMs, 0);
    const finishedAt = new Date(startedAt.getTime() + durationMs);

    const passedCount = testCases.filter((t) => t.status === 'passed').length;
    const failedCount = testCases.filter((t) => t.status === 'failed').length;
    const skippedCount = testCases.filter((t) => t.status === 'skipped').length;

    let status = 'passed';
    if (failedCount > 0) status = failedCount === testCases.length ? 'failed' : 'mixed';

    runs.push({
      project: 'ecommerce-app',
      branch: i % 7 === 0 ? 'release/1.4' : 'main',
      triggeredBy: 'ci',
      framework: 'playwright',
      startedAt,
      finishedAt,
      durationMs,
      status,
      totalTests: testCases.length,
      passedCount,
      failedCount,
      skippedCount,
      testCases
    });
  }

  await TestRun.insertMany(runs);
  console.log(`Seeded ${runs.length} test runs.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
