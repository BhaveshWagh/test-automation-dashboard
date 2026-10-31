const { z } = require('zod');
const testCaseService = require('../services/testCaseService');
const { validateGherkin } = require('../utils/gherkin');
const { sendError } = require('../utils/httpErrors');

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

// POST /api/testcases - create one test case
async function create(req, res) {
  const parsed = TestCaseCreateZ.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid test case', details: formatZodError(parsed.error) });
  }

  try {
    const testCase = await testCaseService.createTestCase(parsed.data, req.user?.id);
    res.status(201).json(testCase);
  } catch (err) {
    sendError(res, err, 'Failed to save test case');
  }
}

// POST /api/testcases/bulk - create many at once (e.g. an LLM-generated batch)
// Validates each item independently so one bad item doesn't sink the whole batch.
async function createBulk(req, res) {
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
    const created = await testCaseService.createTestCasesBulk(validItems);
    res.status(201).json({
      created,
      createdCount: created.length,
      failed,
      failedCount: failed.length
    });
  } catch (err) {
    sendError(res, err, 'Failed to save test cases');
  }
}

// POST /api/testcases/validate-gherkin - lets the UI check a feature file before saving
function validateGherkinEndpoint(req, res) {
  const { ok, errors, featureName, scenarios } = validateGherkin(req.body?.gherkin);
  res.json({ ok, errors, featureName, scenarioCount: scenarios.length });
}

// GET /api/testcases - list, filterable and paginated
async function list(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { testCases, total } = await testCaseService.listTestCases({ query: req.query, page, limit });
    res.json({ testCases, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    sendError(res, err, 'Failed to fetch test cases');
  }
}

// GET /api/testcases/:id - full detail of one test case. :id is a test case ID (TC-0001) or a Mongo _id.
async function getOne(req, res) {
  try {
    const testCase = await testCaseService.getTestCaseById(req.params.id);
    res.json(testCase);
  } catch (err) {
    sendError(res, err, 'Failed to fetch test case');
  }
}

// PUT /api/testcases/:id - full replace
async function replace(req, res) {
  const parsed = TestCaseCreateZ.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid test case', details: formatZodError(parsed.error) });
  }

  try {
    const testCase = await testCaseService.replaceTestCase(req.params.id, parsed.data);
    res.json(testCase);
  } catch (err) {
    sendError(res, err, 'Failed to update test case');
  }
}

// PATCH /api/testcases/:id - partial update
async function patch(req, res) {
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
    const testCase = await testCaseService.patchTestCase(req.params.id, parsed.data);
    res.json(testCase);
  } catch (err) {
    sendError(res, err, 'Failed to update test case');
  }
}

// DELETE /api/testcases/:id
async function remove(req, res) {
  try {
    await testCaseService.deleteTestCase(req.params.id);
    res.json({ message: 'Deleted', id: req.params.id });
  } catch (err) {
    sendError(res, err, 'Failed to delete test case');
  }
}

module.exports = { create, createBulk, validateGherkinEndpoint, list, getOne, replace, patch, remove };
