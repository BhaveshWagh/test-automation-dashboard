# Test Automation Dashboard

A dashboard for tracking automated test run history: pass-rate trends, run
detail drill-down, and **flaky test detection** — tests that flip between
pass and fail across recent runs rather than failing consistently.

Built with a Node/Express/MongoDB backend and a React (Vite) frontend.

## Why this project

Most portfolio CRUD apps look the same to a reviewer. This one is built
around a problem that actually matters in QA/test-automation work — noisy
test suites — and shows:

- **Non-trivial MongoDB usage**: aggregation pipelines for pass-rate and
  duration stats, not just `find()` and `save()`.
- **Real backend logic**: the flaky-test detector walks recent run history
  per test name and computes a flakiness score, not just a static field.
- **A believable data model**: test runs with embedded test-case results,
  indexed for the queries the dashboard actually makes.
- **A dashboard that reads like a real internal tool**: status badges,
  pass-rate trend chart, filterable run detail.

## Architecture

```
backend/                  Express API + MongoDB (Mongoose)
  models/TestRun.js        Schema: a run + its embedded test case results
  models/TestCase.js        Schema: a reusable test case definition (steps, priority, tags)
  routes/runs.js            Ingest a run (POST), list runs, get run detail
  routes/analytics.js       /summary, /trend, /flaky — the aggregation logic
  routes/testcases.js       Full CRUD + bulk-create for test case definitions
  scripts/seed.js           Generates 40 realistic historical runs, including
                             a few deliberately flaky and one deliberately
                             broken test, so the dashboard has something to show

frontend/                 React (Vite) + Recharts + React Router
  src/pages/Dashboard.jsx   Summary stats + pass-rate trend + recent runs
  src/pages/RunsList.jsx    Paginated run history
  src/pages/RunDetail.jsx   Per-test results for one run, filterable by status
  src/pages/FlakyTests.jsx  Ranked list of flaky tests

mcp-server/               Standalone MCP server (stdio) for AI-assisted authoring
  index.js                  Registers tools, connects over stdio
  apiClient.js               Thin axios client calling the backend REST API
  tools/testCaseTools.js     create/bulk_create/list/get/update/delete test cases
  tools/analyticsTools.js    get_flaky_tests, get_run_summary (read-only wrappers)
```

**Data model**: a `TestRun` document embeds its `testCases` array (name,
suite, status, duration, error, retries). Embedding rather than a separate
collection keeps a run's full result set fetchable in one query, which is
how the dashboard actually reads it — the trade-off (harder to query a
single test's full history without pulling every run) is why the flaky
detector limits itself to a bounded recent-run window rather than scanning
the whole collection.

**Flaky detection**: for each test name seen across the last N runs, count
passes vs failures. A test with both is flaky; the flakiness score is
`min(passed, failed) / total` — a test that alternates roughly 50/50 scores
higher than one that fails once in twenty runs.

## Running it locally

You'll need MongoDB running locally (or a free MongoDB Atlas cluster — put
its connection string in `.env`).

### 1. Backend

```bash
cd backend
cp .env.example .env      # edit MONGO_URI if not using local default
npm install
npm run seed               # populates ~40 sample test runs
npm run dev                 # starts on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env       # defaults to http://localhost:5000/api
npm install
npm run dev                 # starts on http://localhost:5173
```

Open `http://localhost:5173` — you should see populated stats, a pass-rate
trend chart, and a few flaky tests flagged.

## Ingesting a real test run

The seed script is for demo data. To feed it real CI results, POST to
`/api/runs` with this shape (this is roughly what you'd generate from a
Playwright or Jest JSON reporter with a small transform script):

```json
{
  "project": "my-app",
  "branch": "main",
  "triggeredBy": "ci",
  "framework": "playwright",
  "startedAt": "2026-09-27T10:00:00Z",
  "finishedAt": "2026-09-27T10:04:12Z",
  "testCases": [
    { "name": "login with valid credentials", "suite": "auth", "status": "passed", "durationMs": 812 }
  ]
}
```

## Test Case Management

Unlike `TestRun` (which only records the *results* of tests that already
ran), `TestCase` is a reusable definition: title, preconditions, ordered
steps (each with its own expected result), priority, type, status, tags,
and a `project`/`suite` grouping consistent with how `TestRun` already
tags runs. `TestCase` and `TestRun` are intentionally decoupled — there's
no foreign key between them, only an optional `linkedTestName` convention
for cross-referencing a case to a `TestRun.testCases[].name`.

REST API (`backend/routes/testcases.js`, validated with Zod):

- `POST /api/testcases` — create one
- `POST /api/testcases/bulk` — create many; invalid items are reported
  individually without failing the valid ones in the same batch
- `GET /api/testcases` — list, filterable by `project`/`suite`/`tag`/`priority`/`status`/`type`, paginated
- `GET /api/testcases/:id` — full detail
- `PUT /api/testcases/:id` — full replace
- `PATCH /api/testcases/:id` — partial update
- `DELETE /api/testcases/:id`

## MCP Server (AI-assisted test case authoring)

`mcp-server/` is a standalone [MCP](https://modelcontextprotocol.io) server
that lets an AI assistant (e.g. Claude Code) create and manage test cases
by calling the REST API above — it never touches MongoDB directly. It's
designed for the workflow "describe a feature, get test cases written and
saved for you": the assistant generates the test case content itself
(steps, sample data, edge cases); the tools just validate the shape and
persist it.

Tools exposed: `create_test_case`, `bulk_create_test_cases`,
`list_test_cases`, `get_test_case`, `update_test_case`, `delete_test_case`,
plus two read-only analytics wrappers (`get_flaky_tests`, `get_run_summary`)
so the assistant can cross-reference flaky CI tests against the test case
bank.

### Running it

```bash
cd mcp-server
npm install
cp .env.example .env   # BACKEND_API_URL, defaults to http://localhost:5000/api
```

A project-scoped `.mcp.json` at the repo root registers the server for
Claude Code automatically (stdio transport, no manual start needed once
the backend is running). For Claude Desktop, add the equivalent block to
`claude_desktop_config.json` with an absolute path to `mcp-server/index.js`.

To test the server standalone without an AI client:

```bash
npx @modelcontextprotocol/inspector node mcp-server/index.js
```

## What to say about this in an interview / resume

- "Built a test-analytics dashboard that ingests CI test results and surfaces
  flaky tests automatically, using a MongoDB aggregation-based flakiness score."
- "Designed the schema to embed test-case results per run for fast read access,
  trading that off against a bounded query window for cross-run analysis."
- "Built with React, Node/Express, and MongoDB — the same stack as \[your day job\],
  applied to a QA tooling problem."

## Possible extensions (good "what would you add next" answers)

- Webhook/GitHub Action that posts results automatically after CI runs
- Slack alert when a test crosses a flakiness threshold
- Auth (JWT) so this could be multi-team
- Per-suite duration trends to catch tests that are getting slower over time
