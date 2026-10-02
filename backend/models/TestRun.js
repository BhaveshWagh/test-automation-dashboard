const mongoose = require('mongoose');

const TestCaseResultSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    suite: { type: String, default: 'default' },
    status: { type: String, enum: ['passed', 'failed', 'skipped'], required: true },
    durationMs: { type: Number, required: true },
    errorMessage: { type: String, default: null },
    retries: { type: Number, default: 0 }
  },
  { _id: false }
);

const TestRunSchema = new mongoose.Schema(
  {
    project: { type: String, required: true, default: 'default-project' },
    branch: { type: String, required: true, default: 'main' },
    triggeredBy: { type: String, default: 'manual' }, // e.g. 'ci', 'manual', github username
    framework: { type: String, default: 'playwright' }, // playwright | jest | selenium
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, required: true },
    durationMs: { type: Number, required: true },
    status: { type: String, enum: ['passed', 'failed', 'mixed'], required: true },
    totalTests: { type: Number, required: true },
    passedCount: { type: Number, required: true },
    failedCount: { type: Number, required: true },
    skippedCount: { type: Number, required: true },
    testCases: { type: [TestCaseResultSchema], default: [] }
  },
  { timestamps: true }
);

TestRunSchema.index({ startedAt: -1 });
TestRunSchema.index({ project: 1, startedAt: -1 });

module.exports = mongoose.model('TestRun', TestRunSchema);
