import { z } from 'zod';
import { api, describeApiError } from '../apiClient.js';

const TestStepShape = {
  stepNumber: z.number().int().positive(),
  action: z.string().min(1),
  expectedResult: z.string().min(1)
};

const AutomationShape = {
  automated: z.boolean().optional(),
  framework: z.string().nullable().optional(),
  filePath: z.string().nullable().optional()
};

const PriorityEnum = z.enum(['low', 'medium', 'high', 'critical']);
const TypeEnum = z.enum(['functional', 'regression', 'smoke', 'e2e', 'integration', 'api']);
const StatusEnum = z.enum(['draft', 'active', 'deprecated']);
const SourceEnum = z.enum(['manual', 'ai-generated']);

// Shared shape for a single test case's createable fields. Used both standalone
// (create_test_case) and nested inside bulk_create_test_cases.
const TestCaseInputShape = {
  title: z.string().min(1).describe('Short, descriptive name of the test case'),
  description: z.string().optional().describe('What this test case verifies and why'),
  preconditions: z.string().optional().describe('State required before executing the steps'),
  steps: z
    .array(z.object(TestStepShape))
    .min(1)
    .describe('Ordered steps, each with an action and its own expected result'),
  expectedResult: z.string().optional().describe('Optional overall/summary expected outcome'),
  priority: PriorityEnum.optional(),
  type: TypeEnum.optional(),
  status: StatusEnum.optional(),
  tags: z.array(z.string()).optional(),
  project: z.string().min(1).describe('Project this test case belongs to'),
  suite: z.string().optional().describe('Suite/feature grouping within the project'),
  automation: z.object(AutomationShape).optional(),
  linkedTestName: z
    .string()
    .nullable()
    .optional()
    .describe('Name matching a TestRun.testCases[].name, if this covers an existing automated test'),
  source: SourceEnum.optional().describe("Defaults to 'manual' server-side; pass 'ai-generated' for LLM-authored cases"),
  createdBy: z.string().optional()
};

function toErrorResult(err) {
  const { status, body } = describeApiError(err);
  return {
    isError: true,
    content: [{ type: 'text', text: `Request failed${status ? ` (HTTP ${status})` : ''}: ${JSON.stringify(body)}` }]
  };
}

function toJsonResult(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

export function registerTestCaseTools(server) {
  server.registerTool(
    'create_test_case',
    {
      title: 'Create Test Case',
      description:
        'Create and persist a single test case (title, steps, expected results, and metadata) in the dashboard.',
      inputSchema: TestCaseInputShape
    },
    async (input) => {
      try {
        const { data } = await api.post('/testcases', input);
        return toJsonResult(data);
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );

  server.registerTool(
    'bulk_create_test_cases',
    {
      title: 'Bulk Create Test Cases',
      description:
        'Create many test cases in one call, e.g. a whole generated suite for a feature. Invalid items are reported individually without failing the valid ones.',
      inputSchema: {
        testCases: z.array(z.object(TestCaseInputShape)).min(1)
      }
    },
    async ({ testCases }) => {
      try {
        const { data } = await api.post('/testcases/bulk', { testCases });
        return toJsonResult(data);
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );

  server.registerTool(
    'list_test_cases',
    {
      title: 'List Test Cases',
      description:
        'Browse/search existing test cases by project, suite, tag, priority, status, or type. Use this before generating new cases to avoid duplicates.',
      inputSchema: {
        project: z.string().optional(),
        suite: z.string().optional(),
        tag: z.string().optional(),
        priority: PriorityEnum.optional(),
        status: StatusEnum.optional(),
        type: TypeEnum.optional(),
        page: z.number().int().positive().optional(),
        limit: z.number().int().positive().optional()
      }
    },
    async (query) => {
      try {
        const { data } = await api.get('/testcases', { params: query });
        return toJsonResult(data);
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );

  server.registerTool(
    'get_test_case',
    {
      title: 'Get Test Case',
      description: 'Fetch full detail of one test case by its id.',
      inputSchema: { id: z.string().min(1) }
    },
    async ({ id }) => {
      try {
        const { data } = await api.get(`/testcases/${id}`);
        return toJsonResult(data);
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );

  server.registerTool(
    'update_test_case',
    {
      title: 'Update Test Case',
      description:
        'Partially update an existing test case - revise steps, change status (e.g. draft to active), adjust priority/tags, etc. Only pass the fields you want to change.',
      inputSchema: {
        id: z.string().min(1),
        ...Object.fromEntries(Object.entries(TestCaseInputShape).map(([k, v]) => [k, v.optional()]))
      }
    },
    async ({ id, ...fields }) => {
      try {
        const { data } = await api.patch(`/testcases/${id}`, fields);
        return toJsonResult(data);
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );

  server.registerTool(
    'delete_test_case',
    {
      title: 'Delete Test Case',
      description: 'Permanently remove a test case by its id.',
      inputSchema: { id: z.string().min(1) }
    },
    async ({ id }) => {
      try {
        const { data } = await api.delete(`/testcases/${id}`);
        return toJsonResult(data);
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );
}
