# ATP Example - Agent Tool Protocol Demo

A demonstration implementation of the Agent Tool Protocol (ATP) based on https://agenttoolprotocol.com/

## Overview

This is a TypeScript Express server that implements a two-agent system using the Agent Tool Protocol principles:

- **Orchestrator Agent**: Main decision-maker that analyzes questions and decides whether to answer directly or delegate to code execution
- **Code Executor Agent**: Generates and executes JavaScript code in an isolated sandbox to solve complex tasks
- **Smart Tool Selection**: The orchestrator intelligently chooses when code execution is needed vs. direct answers
- **Result Interpretation**: Execution results are automatically interpreted into user-friendly responses
- **Isolated Execution**: Safe code execution using vm2 with mock API access

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

## Architecture

The system uses a two-agent architecture:

## 🔄 Flow Diagram

```
User Question
     ↓
Orchestrator Agent
     ↓
  ┌──┴──┐
  │     │
Direct  Delegate
Answer      ↓
  │    Code Executor Agent
  │         ↓
  │    Generate Code
  │         ↓
  │    Execute in Sandbox (sandbox.ts)
  │         ↓
  │    Access Mock APIs (mockApis.ts)
  │    Access ATP Tools (atpHelpers.ts)
  │         ↓
  │    Return Result
  │         ↓
  └─→ Orchestrator Interprets
          ↓
    User-Friendly Answer
```

## API Endpoints

### POST /api/test

Main ATP endpoint that sends questions to the orchestrator agent.

**Request:**

```json
{
  "question": "How many r's in strawberry?"
}
```

**Response (code execution):**

```json
{
  "success": true,
  "question": "How many r's in strawberry?",
  "type": "code_execution",
  "task": "Count the number of times the letter 'r' appears in the word 'strawberry'",
  "generatedCode": "\"strawberry\".split('').filter(c => c === 'r').length",
  "executionResult": 3,
  "answer": "There are 3 r's in the word strawberry."
}
```

**Response (direct answer):**

```json
{
  "success": true,
  "question": "What is ATP?",
  "type": "direct_answer",
  "answer": "ATP (Agent Tool Protocol) is a protocol that allows AI agents to write and execute code instead of calling pre-defined tools..."
}
```

### POST /api/execute

Direct code execution endpoint (bypasses orchestrator).

```json
{
  "code": "const emails = await api.email.list({ limit: 200 }); return emails.filter(e => e.assignee === 'sarah@company.com');",
  "timeout": 5000
}
```

**Response:**

```json
{
  "success": true,
  "result": [
    /* filtered emails */
  ],
  "executionTime": 1234567890
}
```

### POST /api/llm/call

Mock LLM call endpoint for testing multi-level agents.

## Mock APIs Available in Sandbox

When the Code Executor Agent generates and executes code, the following mock APIs are available:

### GitHub API

- `api.github.listPRs({ repo, state })` - List pull requests with checks status
- `api.github.getDiff({ prNumber })` - Get PR diff
- `api.github.postComment({ prNumber, body })` - Post PR comment

### Email API

- `api.email.list({ limit, assignee })` - List emails
- `api.email.send({ to, subject, body })` - Send email

### Slack API

- `api.slack.postMessage({ channel, text })` - Post Slack message

### CRM API

- `api.crm.getCustomers({ limit })` - Get CRM customers
- `api.crm.batchUpdate(customers)` - Batch update customers

### Clearbit API

- `api.clearbit.enrich({ domain })` - Enrich company data

## Example Usage

### Simple Questions (Direct Answer)

```bash
curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{"question": "What is ATP?"}'
```

The orchestrator will answer directly without code execution.

### Computational Tasks (Code Execution)

```bash
curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{"question": "How many rs in strawberry?"}'
```

The orchestrator will:

1. Detect this needs computation
2. Delegate to Code Executor Agent
3. Code Executor generates: `"strawberry".split('').filter(c => c === 'r').length`
4. Execute in sandbox → Result: `3`
5. Orchestrator interprets: "There are 3 r's in the word strawberry."

### API-based Tasks

```bash
curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{"question": "Get all failing PRs from company/product repo"}'
```

The Code Executor will generate and execute:

```javascript
(async () => {
  const prs = await api.github.listPRs({
    repo: "company/product",
    state: "open",
  });
  return prs.filter((pr) => pr.checks === "failing");
})();
```

### Direct Code Execution (Bypass Orchestrator)

```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const prs = await api.github.listPRs({ repo: \"company/product\", state: \"open\" }); prs.filter(pr => pr.checks === \"failing\")"
  }'
```

## Key Features

### 1. Two-Agent Architecture

- **Orchestrator Agent**: Makes intelligent decisions about when to use code execution
- **Code Executor Agent**: Specializes in generating and executing code
- Clear separation of concerns and responsibilities

### 2. Smart Delegation

- Orchestrator analyzes each question
- Simple questions get direct answers (no code execution overhead)
- Complex tasks are delegated to Code Executor
- Results are automatically interpreted into user-friendly responses

### 3. Code Execution (ATP Principle)

- Agents write JavaScript code instead of calling pre-defined tools
- Enables filtering, mapping, reducing without multiple LLM calls
- Solves the "strawberry problem" - agents can build their own solutions
- Supports async/await and Promise.all for parallel operations

### 4. Result Interpretation

- Raw execution results are automatically converted to natural language
- User gets friendly answers, not just raw data
- Full transparency with generated code and execution results included

### 5. Security

- Isolated sandbox with vm2
- No file system, network, or process access
- Mock APIs only (safe for testing)

## Project Structure

```
src/
├── agents/              # AI Agents
│   ├── orchestrator.ts  # Main decision-making agent
│   └── codeExecutor.ts  # Code generation & execution agent
├── models/              # LLM Models
│   └── llm.ts          # Model initialization and helpers
├── utils/               # Utility functions
│   └── sandbox.ts      # Code execution sandbox & mock APIs
└── server.ts           # Express server & API endpoints
```

See [STRUCTURE.md](./STRUCTURE.md) for detailed architecture documentation.

## Limitations (Demo Implementation)

This is a demonstration server using Google Gemini AI:

- Uses ChatGoogleGenerativeAI model (requires GOOGLE_API_KEY in .env)
- Mock API responses (no real GitHub, Slack, etc. APIs)
- Basic sandbox security (vm2 has known vulnerabilities, use for testing only)
- No persistent storage
- No authentication

For production, you would need:

- More secure sandboxing (isolated-vm, Deno, WebAssembly, etc.)
- Real API integrations
- Proper authentication and authorization
- Rate limiting and monitoring
- Error handling and retry logic
- Persistent storage for conversation history

## Environment Setup

Create a `.env` file in the root directory:

```env
GOOGLE_API_KEY=your_google_gemini_api_key_here
```

Get your API key from: https://ai.google.dev/

## Why ATP?

From the [ATP documentation](https://agenttoolprotocol.com/):

> AI agents shouldn't call pre-defined tools - they should write code.

ATP advantages over traditional tool calling (like MCP):

- **29x cheaper** on average - Less LLM calls needed
- **56x faster** on average - Direct code execution vs multiple tool calls
- **95%+ less context pollution** - No need to load all tool definitions upfront
- **Real composition** - Chain operations in code, not through multiple tool calls
- **Parallel execution** - Use `Promise.all` for concurrent operations
- **Solves the strawberry problem** - Agents can build custom solutions for tasks they weren't explicitly designed for

## Contributing

This is a demonstration project. Feel free to:

- Add more mock APIs
- Improve the agent prompts
- Add more sophisticated error handling
- Implement additional agents
- Add tests

## References

- [Agent Tool Protocol Website](https://agenttoolprotocol.com/)
- [Cloudflare's Code Mode Article](https://blog.cloudflare.com/code-mode/)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)

## License

ISC
