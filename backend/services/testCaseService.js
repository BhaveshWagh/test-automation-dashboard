const TestCase = require('../models/TestCase');
const Counter = require('../models/Counter');
const User = require('../models/User');
const { formatId, idFilter } = require('../utils/ids');
const { COLLATION, rank, parseSort, sortStages } = require('../utils/sortQuery');
const { AppError } = require('../utils/httpErrors');

// Columns the Test Cases table can sort by. Priority and status sort by their natural order, not alphabetically.
const SORTABLE_COLUMNS = {
  testCaseId: ['$testCaseId'],
  title: ['$title'],
  format: [{ $ifNull: ['$format', 'manual'] }],
  project: ['$project', '$suite'],
  priority: [rank('priority', ['low', 'medium', 'high', 'critical'])],
  status: [rank('status', ['draft', 'active', 'deprecated'])],
  source: ['$source'],
  tags: [{ $ifNull: [{ $arrayElemAt: ['$tags', 0] }, ''] }],
  createdAt: ['$createdAt']
};

// Gives every item a unique testCaseId. The numbers are reserved in one atomic counter update,
// so simultaneous creations (any number of users) can never receive the same ID.
async function withTestCaseIds(items) {
  if (items.length === 0) return items;
  const first = await Counter.reserve('testcase', items.length);
  return items.map((item, i) => ({ ...item, testCaseId: formatId('TC', first + i) }));
}

// Who created it: an explicit createdBy (e.g. MCP) wins, otherwise the signed-in user's name.
async function resolveCreator(actorUserId, explicit) {
  if (explicit) return explicit;
  const user = await User.findById(actorUserId).select('name').catch(() => null);
  return user?.name || 'unknown';
}

function buildListFilter({ project, suite, tag, priority, status, type, source, format, q }) {
  const filter = {};
  if (project) filter.project = project;
  if (suite) filter.suite = suite;
  if (tag) filter.tags = tag;
  if (priority) filter.priority = priority;
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (source) filter.source = source;
  // Older test cases have no stored format and are manual, so "manual" must match them too (null matches missing).
  if (format) filter.format = format === 'manual' ? { $in: ['manual', null] } : format;
  if (q) {
    const pattern = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: pattern }, { testCaseId: pattern }];
  }
  return filter;
}

async function createTestCase(data, actorUserId) {
  const [withId] = await withTestCaseIds([
    { ...data, createdBy: await resolveCreator(actorUserId, data.createdBy) }
  ]);
  const testCase = new TestCase(withId);
  await testCase.save();
  return testCase;
}

// Assumes `validItems` already passed per-item schema validation (done by the controller),
// so a bad item never sinks the whole batch.
async function createTestCasesBulk(validItems) {
  const withIds = await withTestCaseIds(validItems);
  return withIds.length ? TestCase.insertMany(withIds, { ordered: false }) : [];
}

async function listTestCases({ query, page, limit }) {
  const filter = buildListFilter(query);

  const { sort, error } = parseSort(query, SORTABLE_COLUMNS);
  if (error) throw new AppError(400, error);

  let testCases;
  if (sort) {
    const { stages, cleanup } = sortStages(sort);
    testCases = await TestCase.aggregate([
      { $match: filter },
      ...stages,
      { $skip: (page - 1) * Number(limit) },
      { $limit: Number(limit) },
      { $project: Object.fromEntries(cleanup.map((k) => [k, 0])) }
    ]).collation(COLLATION);
  } else {
    testCases = await TestCase.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
  }

  const total = await TestCase.countDocuments(filter);
  return { testCases, total };
}

async function getTestCaseById(id) {
  const testCase = await TestCase.findOne(idFilter(id, 'testCaseId'));
  if (!testCase) throw new AppError(404, 'Test case not found');
  return testCase;
}

async function replaceTestCase(id, data) {
  // A replace would drop the assigned ID, so carry it over.
  const existing = await TestCase.findOne(idFilter(id, 'testCaseId')).select('testCaseId');
  if (!existing) throw new AppError(404, 'Test case not found');
  const replacement = existing.testCaseId ? { ...data, testCaseId: existing.testCaseId } : data;

  const testCase = await TestCase.findOneAndReplace({ _id: existing._id }, replacement, {
    new: true,
    runValidators: true
  });
  if (!testCase) throw new AppError(404, 'Test case not found');
  return testCase;
}

async function patchTestCase(id, data) {
  const testCase = await TestCase.findOneAndUpdate(
    idFilter(id, 'testCaseId'),
    { $set: data },
    { new: true, runValidators: true }
  );
  if (!testCase) throw new AppError(404, 'Test case not found');
  return testCase;
}

async function deleteTestCase(id) {
  const testCase = await TestCase.findOneAndDelete(idFilter(id, 'testCaseId'));
  if (!testCase) throw new AppError(404, 'Test case not found');
  return testCase;
}

module.exports = {
  createTestCase,
  createTestCasesBulk,
  listTestCases,
  getTestCaseById,
  replaceTestCase,
  patchTestCase,
  deleteTestCase
};
