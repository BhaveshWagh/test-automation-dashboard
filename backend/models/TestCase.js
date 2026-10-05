const mongoose = require('mongoose');

const TestStepSchema = new mongoose.Schema(
  {
    stepNumber: { type: Number, required: true },
    action: { type: String, required: true },
    expectedResult: { type: String, required: true }
  },
  { _id: false }
);

const TestCaseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    preconditions: { type: String, default: '' },
    steps: {
      type: [TestStepSchema],
      default: [],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one step is required'
      }
    },
    expectedResult: { type: String, default: '' }, // optional overall/summary expected outcome

    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    type: {
      type: String,
      enum: ['functional', 'regression', 'smoke', 'e2e', 'integration', 'api'],
      default: 'functional'
    },
    status: { type: String, enum: ['draft', 'active', 'deprecated'], default: 'draft' },

    tags: { type: [String], default: [] },

    project: { type: String, required: true, default: 'default-project' },
    suite: { type: String, default: 'default' },

    automation: {
      automated: { type: Boolean, default: false },
      framework: { type: String, default: null }, // e.g. 'playwright', 'jest', 'selenium'
      filePath: { type: String, default: null } // e.g. 'e2e/checkout.spec.ts'
    },

    // Loose cross-reference convention to TestRun.testCases[].name - not a hard ref
    linkedTestName: { type: String, default: null },

    source: { type: String, enum: ['manual', 'ai-generated'], default: 'manual' },
    createdBy: { type: String, default: 'unknown' }
  },
  { timestamps: true }
);

TestCaseSchema.index({ project: 1, suite: 1 });
TestCaseSchema.index({ tags: 1 });

module.exports = mongoose.model('TestCase', TestCaseSchema);
