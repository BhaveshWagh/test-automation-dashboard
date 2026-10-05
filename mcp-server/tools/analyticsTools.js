import { z } from 'zod';
import { api, describeApiError } from '../apiClient.js';

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

export function registerAnalyticsTools(server) {
  server.registerTool(
    'get_flaky_tests',
    {
      title: 'Get Flaky Tests',
      description:
        'List tests that flip between passed/failed across recent CI runs, ranked by flakiness. Useful for deciding which flaky behavior needs a dedicated regression test case.',
      inputSchema: {
        project: z.string().optional(),
        runWindow: z.number().int().positive().optional().describe('How many recent runs to scan (default 20)')
      }
    },
    async (query) => {
      try {
        const { data } = await api.get('/analytics/flaky', { params: query });
        return toJsonResult(data);
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );

  server.registerTool(
    'get_run_summary',
    {
      title: 'Get Run Summary',
      description: 'Headline test-health stats (total runs, latest run, average duration, overall pass rate) for a project.',
      inputSchema: {
        project: z.string().optional()
      }
    },
    async (query) => {
      try {
        const { data } = await api.get('/analytics/summary', { params: query });
        return toJsonResult(data);
      } catch (err) {
        return toErrorResult(err);
      }
    }
  );
}
