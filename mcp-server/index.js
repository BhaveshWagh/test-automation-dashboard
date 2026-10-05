import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTestCaseTools } from './tools/testCaseTools.js';
import { registerAnalyticsTools } from './tools/analyticsTools.js';

const server = new McpServer({
  name: 'test-automation-dashboard',
  version: '1.0.0'
});

registerTestCaseTools(server);
registerAnalyticsTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
