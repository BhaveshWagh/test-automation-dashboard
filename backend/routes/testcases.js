const express = require('express');
const { z } = require('zod');
const router = express.Router();
const TestCase = require('../models/TestCase');

const TestStepZ = z.object({
  stepNumber: z.number().int().positive(),
  action: z.string().min(1),
  expectedResult: z.string().min(1)
});

const TestCaseCreateZ = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  preconditions: z.string().optional(),
  steps: z.array(TestStepZ).min(1, 'At least one step is required'),
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

const TestCaseUpdateZ = TestCaseCreateZ.partial();

function formatZodError(zodError) {
  return zodError.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
}

// POST /api/testcases - create one test case
router.post('/', async (req, res) => {
  const parsed = TestCaseCreateZ.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid test case', details: formatZodError(parsed.error) });
  }

  try {
    const testCase = new TestCase(parsed.data);
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
    const created = validItems.length
      ? await TestCase.insertMany(validItems, { ordered: false })
      : [];

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

// GET /api/testcases - list, filterable and paginated
router.get('/', async (req, res) => {
  try {
    const { project, suite, tag, priority, status, type, source, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (project) filter.project = project;
    if (suite) filter.suite = suite;
    if (tag) filter.tags = tag;
    if (priority) filter.priority = priority;
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (source) filter.source = source;

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

// GET /api/testcases/:id - full detail of one test case
router.get('/:id', async (req, res) => {
  try {
    const testCase = await TestCase.findById(req.params.id);
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
    const testCase = await TestCase.findOneAndReplace({ _id: req.params.id }, parsed.data, {
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

  try {
    const testCase = await TestCase.findByIdAndUpdate(
      req.params.id,
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
    const testCase = await TestCase.findByIdAndDelete(req.params.id);
    if (!testCase) return res.status(404).json({ error: 'Test case not found' });
    res.json({ message: 'Deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete test case', details: err.message });
  }
});

module.exports = router;
