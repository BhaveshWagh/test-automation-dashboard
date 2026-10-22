const express = require('express');
const { z } = require('zod');
const router = express.Router();
const TestCase = require('../models/TestCase');
const Counter = require('../models/Counter');
const User = require('../models/User');
const { validateGherkin } = require('../utils/gherkin');
const { formatId, idFilter } = require('../utils/ids');

const TestStepZ = z.object({
  stepNumber: z.number().int().positive(),
  action: z.string().min(1),
  expectedResult: z.string().min(1)
});

const TestCaseBaseZ = z.object({
  title: z.string().trim().min(1, 'Test case name is required').max(200),
  scenario: z.string().max(1000).optional(),
  description: z.string().optional(),
  preconditions: z.string().optional(),
  testData: z.string().optional(),
  postconditions: z.string().optional(),
  requirementRef: z.string().max(200).optional(),
  format: z.enum(['manual', 'cucumber']).optional(),
  gherkin: z.string().optional(),
  steps: z.array(TestStepZ).optional(),
  expectedResult: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  type: z.enum(['functional', 'regression', 'smoke', 'e2e', 'integration', 'api']).optional(),
  status: z.enum(['draft', 'active', 'deprecated']).optional(),
  tags: z.array(z.string()).optional(),
  project: z.string().min(1),
  suite: z.string().optional(),
  automation: z
    .object({
      automated: z.boolean().optional(),
      framework: z.string().nullable().optional(),
      filePath: z.string().nullable().optional()
    })
    .optional(),
  linkedTestName: z.string().nullable().optional(),
  source: z.enum(['manual', 'ai-generated']).optional(),
  createdBy: z.string().optional()
});

// A manual test case needs steps; a cucumber one needs valid Gherkin instead.
function requireFormatContent(data, ctx) {
  const format = data.format ?? 'manual';
  if (format === 'cucumber') {
    const result = validateGherkin(data.gherkin);
    result.errors.forEach((message) => ctx.addIssue({ code: 'custom', path: ['gherkin'], message }));
  } else if (!data.steps || data.steps.length === 0) {
    ctx.addIssue({ code: 'custom', path: ['steps'], message: 'At least one step is required' });
  }
}

const TestCaseCreateZ = TestCaseBaseZ.superRefine(requireFormatContent);
const TestCaseUpdateZ = TestCaseBaseZ.partial();

function formatZodError(zodError) {
  return zodError.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
}

// Gives every item a unique testCaseId. The numbers are reserved in one atomic counter update,
// so simultaneous creations (any number of users) can never receive the same ID.
async function withTestCaseIds(items) {
  if (items.length === 0) return items;
  const first = await Counter.reserve('testcase', items.length);
  return items.map((item, i) => ({ ...item, testCaseId: formatId('TC', first + i) }));
}

// Who created it: an explicit createdBy (e.g. MCP) wins, otherwise the signed-in user's name.
async function resolveCreator(req, explicit) {
  if (explicit) return explicit;
  const user = await User.findById(req.user?.id).select('name').catch(() => null);
  return user?.name || 'unknown';
}

// POST /api/testcases - create one test case
router.post('/', async (req, res) => {
  const parsed = TestCaseCreateZ.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid test case', details: formatZodError(parsed.error) });
  }

  try {
    const [data] = await withTestCaseIds([
      { ...parsed.data, createdBy: await resolveCreator(req, parsed.data.createdBy) }
    ]);
    const testCase = new TestCase(data);
    await testCase.save();
    res.status(201).json(testCase);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save test case', details: err.message });
  }
});

// POST /api/testcases/bulk - create many at once (e.g. an LLM-generated batch)
// Validates each item independently so one bad item doesn't sink the whole batch.
router.post('/bulk', async (req, res) => {
  const { testCases } = req.body;

  if (!Array.isArray(testCases) || testCases.length === 0) {
    return res.status(400).json({ error: 'testCases array is required and cannot be empty' });
  }

  const validItems = [];
  const failed = [];

  testCases.forEach((item, index) => {
    const parsed = TestCaseCreateZ.safeParse(item);
    if (parsed.success) {
      validItems.push(parsed.data);
    } else {
      failed.push({ index, errors: formatZodError(parsed.error) });
    }
  });

  try {
    const withIds = await withTestCaseIds(validItems);
    const created = withIds.length ? await TestCase.insertMany(withIds, { ordered: false }) : [];

    res.status(201).json({
      created,
      createdCount: created.length,
      failed,
      failedCount: failed.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save test cases', details: err.message });
  }
});

// POST /api/testcases/validate-gherkin - lets the UI check a feature file before saving
router.post('/validate-gherkin', (req, res) => {
  const { ok, errors, featureName, scenarios } = validateGherkin(req.body?.gherkin);
  res.json({ ok, errors, featureName, scenarioCount: scenarios.length });
});

// GET /api/testcases - list, filterable and paginated
router.get('/', async (req, res) => {
  try {
    const { project, suite, tag, priority, status, type, source, format, q, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (project) filter.project = project;
    if (suite) filter.suite = suite;
    if (tag) filter.tags = tag;
    if (priority) filter.priority = priority;
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (source) filter.source = source;
    if (format) filter.format = format;
    if (q) {
      const pattern = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: pattern }, { testCaseId: pattern }];
    }

    const testCases = await TestCase.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await TestCase.countDocuments(filter);
    res.json({ testCases, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch test cases', details: err.message });
  }
});

// GET /api/testcases/:id - full detail of one test case. :id is a test case ID (TC-0001) or a Mongo _id.
router.get('/:id', async (req, res) => {
  try {
    const testCase = await TestCase.findOne(idFilter(req.params.id, 'testCaseId'));
    if (!testCase) return res.status(404).json({ error: 'Test case not found' });
    res.json(testCase);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch test case', details: err.message });
  }
});

// PUT /api/testcases/:id - full replace
router.put('/:id', async (req, res) => {
  const parsed = TestCaseCreateZ.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid test case', details: formatZodError(parsed.error) });
  }

  try {
    // A replace would drop the assigned ID, so carry it over.
    const existing = await TestCase.findOne(idFilter(req.params.id, 'testCaseId')).select('testCaseId');
    if (!existing) return res.status(404).json({ error: 'Test case not found' });
    const replacement = existing.testCaseId ? { ...parsed.data, testCaseId: existing.testCaseId } : parsed.data;

    const testCase = await TestCase.findOneAndReplace({ _id: existing._id }, replacement, {
      new: true,
      runValidators: true
    });
    if (!testCase) return res.status(404).json({ error: 'Test case not found' });
    res.json(testCase);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update test case', details: err.message });
  }
});

// PATCH /api/testcases/:id - partial update
router.patch('/:id', async (req, res) => {
  const parsed = TestCaseUpdateZ.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid test case', details: formatZodError(parsed.error) });
  }
  if (Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ error: 'At least one field is required' });
  }
  if (parsed.data.gherkin !== undefined) {
    const result = validateGherkin(parsed.data.gherkin);
    if (!result.ok) {
      return res.status(400).json({
        error: 'Invalid test case',
        details: result.errors.map((message) => ({ path: 'gherkin', message }))
      });
    }
  }

  try {
    const testCase = await TestCase.findOneAndUpdate(
      idFilter(req.params.id, 'testCaseId'),
      { $set: parsed.data },
      { new: true, runValidators: true }
    );
    if (!testCase) return res.status(404).json({ error: 'Test case not found' });
    res.json(testCase);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update test case', details: err.message });
  }
});

// DELETE /api/testcases/:id
router.delete('/:id', async (req, res) => {
  try {
    const testCase = await TestCase.findOneAndDelete(idFilter(req.params.id, 'testCaseId'));
    if (!testCase) return res.status(404).json({ error: 'Test case not found' });
    res.json({ message: 'Deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete test case', details: err.message });
  }
});

module.exports = router;
