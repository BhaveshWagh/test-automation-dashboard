/**
 * Backfill script: gives every existing test case a testCaseId (TC-0001) and every existing run a
 * runId (RUN-0001) so they can be opened with readable URLs. Safe to run repeatedly - records that
 * already have an ID are left alone, and nothing else is modified.
 *
 * Usage: npm run backfill-ids   (or: node scripts/backfill-ids.js)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const TestCase = require('../models/TestCase');
const TestRun = require('../models/TestRun');
const Counter = require('../models/Counter');
const { formatId } = require('../utils/ids');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test_automation_dashboard';

const missing = (field) => ({ $or: [{ [field]: { $exists: false } }, { [field]: null }, { [field]: '' }] });

async function backfill(Model, field, prefix, counterName, sortKey) {
  const docs = await Model.find(missing(field)).sort({ [sortKey]: 1, _id: 1 }).select('_id');
  if (docs.length === 0) return 0;

  // One atomic reservation for the whole block: no overlap with IDs handed out to live requests.
  const first = await Counter.reserve(counterName, docs.length);
  await Model.bulkWrite(
    docs.map((doc, i) => ({
      updateOne: {
        filter: { _id: doc._id, ...missing(field) },
        update: { $set: { [field]: formatId(prefix, first + i) } }
      }
    }))
  );
  return docs.length;
}

async function main() {
  await mongoose.connect(MONGO_URI);
  // Make sure the unique indexes exist before writing.
  await Promise.all([TestCase.init(), TestRun.init()]);

  const cases = await backfill(TestCase, 'testCaseId', 'TC', 'testcase', 'createdAt');
  const runs = await backfill(TestRun, 'runId', 'RUN', 'run', 'startedAt');
  console.log(`Assigned IDs: ${cases} test case(s), ${runs} run(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
