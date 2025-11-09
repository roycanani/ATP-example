# Mock ATP Server

A mock implementation of the Agent Tool Protocol (ATP) based on the specification at https://agenttoolprotocol.com/

## Overview

This is a TypeScript Express server that simulates the core features of ATP:

- **Code Execution**: Agents can write and execute JavaScript code in an isolated sandbox
- **Smart Discovery**: Search for relevant API endpoints only when needed (vs MCP's early discovery)
- **Multi-level Agents**: Support for nested LLM calls via `atp.llm.call()` and `atp.llm.extract()`
- **OpenAPI Integration**: Register and use OpenAPI specs
- **Security**: Isolated code execution with vm2, API annotations (safe/destructive)

## Quick Start

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Run production build
pnpm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### POST /api/register
Register a new OpenAPI spec with the ATP server.

```json
{
  "name": "stripe",
  "spec": { /* OpenAPI 3.0 spec */ },
  "auth": {
    "scheme": "bearer",
    "envVar": "STRIPE_KEY"
  }
}
```

### GET /api/list
List all registered APIs.

### POST /api/search
Search for relevant API endpoints based on a query (ATP's solution to MCP's early discovery problem).

```json
{
  "query": "send email",
  "limit": 10
}
```

Response:
```json
{
  "query": "send email",
  "results": [
    {
      "name": "email.send",
      "method": "POST",
      "path": "/api/email/send",
      "signature": "email.send(to: string, subject: string, body: string)",
      "description": "Send an email to specified recipients",
      "annotations": { "destructive": true }
    }
  ],
  "count": 1
}
```

### POST /api/execute
Execute JavaScript code in an isolated sandbox (core ATP feature).

```json
{
  "code": "const emails = await api.email.list({ limit: 200 }); return emails.filter(e => e.assignee === 'sarah@company.com');",
  "timeout": 5000
}
```

Response:
```json
{
  "success": true,
  "result": [ /* filtered emails */ ],
  "executionTime": 1234567890
}
```

### POST /api/llm/call
Multi-level agent support - spawn sub-agents.

```json
{
  "prompt": "Analyze this data...",
  "model": "gpt-4",
  "temperature": 0.7
}
```

### POST /api/llm/extract
Extract structured data with schema validation.

```json
{
  "prompt": "Extract key issues from: Customer feedback here...",
  "schema": {
    "category": "string",
    "severity": "number",
    "issue": "string"
  }
}
```

### GET /health
Health check endpoint.

## Mock APIs Available in Sandbox

When executing code, the following mock APIs are available:

- `api.email.list()` - List emails
- `api.email.send()` - Send email
- `api.github.listPRs()` - List pull requests
- `api.github.getDiff()` - Get PR diff
- `api.github.postComment()` - Post PR comment
- `api.slack.postMessage()` - Post Slack message
- `api.crm.getCustomers()` - Get CRM customers
- `api.crm.batchUpdate()` - Batch update customers
- `api.clearbit.enrich()` - Enrich company data

## Example Usage

### Filter Emails (ATP vs MCP Benchmark)
```javascript
// POST /api/execute
{
  "code": `
    const emails = await api.email.list({ limit: 200 });
    const sarahEmails = emails.filter(e => e.assignee === 'sarah@company.com');
    return sarahEmails;
  `
}
```

### Multi-level Agent with Parallel Processing
```javascript
// POST /api/execute
{
  "code": `
    const customers = await api.crm.getCustomers({ limit: 150 });
    
    // Parallel enrichment with sub-agents
    const enriched = await Promise.all(
      customers.map(async customer => {
        const companyData = await api.clearbit.enrich({ domain: customer.domain });
        return { ...customer, ...companyData };
      })
    );
    
    await api.crm.batchUpdate(enriched);
    return { updated: enriched.length };
  `
}
```

## Key Features

### 1. Smart Discovery (vs MCP)
- MCP: `list_tools` runs before agent reasoning, bloating context
- ATP: Search endpoints only when needed based on agent's query

### 2. Code Execution (vs Tool Calling)
- Agents write JavaScript code instead of calling pre-defined tools
- Enables filtering, mapping, reducing without multiple LLM calls
- Solves the "strawberry problem" - agents can build their own solutions

### 3. Multi-level Agents
- `atp.llm.call()` - Spawn sub-agents for complex tasks
- Parallel execution with `Promise.all`
- Keeps main context clean

### 4. Security
- Isolated sandbox with vm2
- No file system, network, or process access
- API annotations (safe/destructive/sensitive)
- Support for approval flows (mocked)

## Limitations (Mock Implementation)

This is a mock server for testing and development:

- LLM calls return mock responses
- API calls return mock data
- No real authentication
- Simplified OpenAPI parsing
- Basic sandbox security (vm2 has known vulnerabilities, use for testing only)

For production, you would need:
- Real LLM integration (OpenAI, Anthropic, etc.)
- Actual API proxying
- Proper authentication and authorization
- More secure sandboxing (isolated-vm, Deno, WebAssembly, etc.)
- Persistent storage for registered APIs
- Rate limiting and monitoring

## Architecture

```
┌─────────────────────────────────────────┐
│         ATP Server (Express)            │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │
│  │   API Discovery (/api/search)     │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Code Execution (/api/execute)    │ │
│  │  • Isolated VM (vm2)              │ │
│  │  • Mock APIs available            │ │
│  │  • atp.llm helpers                │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Multi-level Agents               │ │
│  │  • /api/llm/call                  │ │
│  │  • /api/llm/extract               │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  OpenAPI Registry                 │ │
│  │  • /api/register                  │ │
│  │  • /api/list                      │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

## Why ATP?

From the ATP documentation:

> OpenAPI was designed for developers writing code. AI agents shouldn't call pre-defined tools - they should write code.

ATP advantages:
- **29x cheaper** on average vs MCP
- **56x faster** on average vs MCP
- **95%+ less context pollution**
- **Real composition** - chain operations in code, not through tool calls
- **Parallel execution** - `Promise.all` for concurrent operations
- **Smart discovery** - search only when needed

## License

ISC
