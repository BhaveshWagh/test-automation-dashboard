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
    // Human-readable ID (TC-0001), assigned on creation. Older test cases don't have one.
    testCaseId: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    scenario: { type: String, default: '' }, // one-line scenario / objective under test
    description: { type: String, default: '' },
    preconditions: { type: String, default: '' },
    testData: { type: String, default: '' },
    postconditions: { type: String, default: '' },
    requirementRef: { type: String, default: '' }, // linked requirement / ticket, e.g. JIRA-123

    // How the test case is written: step-by-step 'manual', or BDD 'cucumber' (Gherkin in `gherkin`).
    format: { type: String, enum: ['manual', 'cucumber'], default: 'manual' },
    gherkin: { type: String, default: '' },
    steps: {
      type: [TestStepSchema],
      default: [],
      validate: {
        // Cucumber test cases keep their steps inside the Gherkin text.
        validator: function (arr) {
          return this?.format === 'cucumber' || (Array.isArray(arr) && arr.length > 0);
        },
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
// Unique when present; legacy documents without an ID are ignored by the index.
TestCaseSchema.index({ testCaseId: 1 }, { unique: true, partialFilterExpression: { testCaseId: { $type: 'string' } } });

module.exports = mongoose.model('TestCase', TestCaseSchema);
