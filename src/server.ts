import "dotenv/config";
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { VM } from "vm2";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  maxOutputTokens: 2048,
});

app.post("/api/test", async (req: Request, res: Response) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  try {
    // Step 1: Generate code based on question
    const prompt = `You are a code generator. Write JavaScript code to solve this task.

Available API:
- api.github.listPRs({ repo, state }) - Returns array of PRs with {number, title, state, checks}
- api.github.getDiff({ prNumber }) - Returns diff string for a PR
- api.github.postComment({ prNumber, body }) - Posts comment on PR

Task: ${question}

IMPORTANT: The last expression will be automatically returned. If you define a function, make sure to call it at the end.

Good examples:
- "strawberry".split('').filter(c => c === 'r').length
- (async () => { const prs = await api.github.listPRs({ repo: 'company/product', state: 'open' }); return prs.length; })()
- const solve = async () => { const prs = await api.github.listPRs({ repo: 'company/product', state: 'open' }); return prs.filter(pr => pr.checks === 'failing'); }; solve()

Write ONLY the JavaScript code, no explanations or markdown. Do NOT use return statements at the top level.`;

    const response: any = await (model as any).invoke(prompt);
    const text =
      typeof response === "string"
        ? response
        : response.content || response.text || JSON.stringify(response);

    // Extract code from markdown if present
    const generatedCode = text
      .replace(/```javascript\n?/g, "")
      .replace(/```js\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    console.log("[ATP] Generated code:", generatedCode);

    // Step 2: Execute the code in sandbox
    const vm = new VM({
      timeout: 5000,
      sandbox: {
        api: createApiMock(),
        Promise,
        console: {
          log: (...args: any[]) => console.log("[Sandbox]", ...args),
        },
      },
    });

    const result = await vm.run(generatedCode);
    console.log("[ATP] Execution result:", result);

    res.json({
      success: true,
      question,
      generatedCode,
      result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
});

/**
 * POST /api/execute
 * Execute JavaScript code in an isolated sandbox
 * This is the core of ATP - agents write and execute code
 */
app.post("/api/execute", async (req: Request, res: Response) => {
  const { code, timeout = 5000, context = {} } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Code is required" });
  }

  try {
    // Create isolated VM with vm2
    const vm = new VM({
      timeout,
      sandbox: {
        // Provide API helpers in the sandbox
        api: createApiMock(),
        atp: {
          llm: {
            call: async (prompt: string) => {
              // Mock LLM call for demo
              return { result: `Mock LLM response to: ${prompt}` };
            },
            extract: async ({
              prompt,
              schema,
            }: {
              prompt: string;
              schema: any;
            }) => {
              // Mock structured extraction
              return { extracted: "Mock extracted data", schema };
            },
          },
        },
        Promise,
        console: {
          log: (...args: any[]) => console.log("[Sandbox]", ...args),
        },
        ...context,
      },
    });

    // Execute the code
    const result = await vm.run(code);

    res.json({
      success: true,
      result,
      executionTime: Date.now(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
});

/**
 * POST /api/llm/call
 * Multi-level agent support - agents can spawn sub-agents
 */
app.post("/api/llm/call", async (req: Request, res: Response) => {
  const { prompt, model = "gpt-4", temperature = 0.7 } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  // Mock LLM response
  const mockResponse = {
    id: `chatcmpl-${Date.now()}`,
    model,
    choices: [
      {
        message: {
          role: "assistant",
          content: `Mock response to: ${prompt.substring(0, 100)}...`,
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: Math.floor(prompt.length / 4),
      completion_tokens: 50,
      total_tokens: Math.floor(prompt.length / 4) + 50,
    },
  };

  res.json(mockResponse);
});

// Create mock API object for sandbox
function createApiMock() {
  return {
    email: {
      list: async ({ limit = 50, assignee }: any = {}) => {
        const emails = Array.from({ length: limit }, (_, i) => ({
          id: i + 1,
          subject: `Email ${i + 1}`,
          from: `sender${i}@example.com`,
          assignee: i % 3 === 0 ? "sarah@company.com" : "john@company.com",
          content: `Email content ${i + 1}`,
        }));
        return assignee
          ? emails.filter((e) => e.assignee === assignee)
          : emails;
      },
      send: async ({ to, subject, body }: any) => {
        console.log(`[Mock] Sending email to ${to}: ${subject}`);
        return { success: true, id: Date.now() };
      },
    },
    github: {
      listPRs: async ({ repo, state = "open" }: any) => {
        return Array.from({ length: 10 }, (_, i) => ({
          number: i + 1,
          title: `PR #${i + 1}`,
          state,
          checks: i % 2 === 0 ? "passing" : "failing",
        }));
      },
      getDiff: async ({ prNumber }: any) => {
        return `Mock diff for PR #${prNumber}`;
      },
      postComment: async ({ prNumber, body }: any) => {
        console.log(`[Mock] Posting comment on PR #${prNumber}`);
        return { success: true };
      },
    },
    slack: {
      postMessage: async ({ channel, text }: any) => {
        console.log(`[Mock] Posting to ${channel}: ${text}`);
        return { success: true, ts: Date.now() };
      },
    },
    crm: {
      getCustomers: async ({ limit = 50 }: any = {}) => {
        return Array.from({ length: limit }, (_, i) => ({
          id: i + 1,
          name: `Customer ${i + 1}`,
          email: `customer${i}@example.com`,
          domain: `company${i}.com`,
        }));
      },
      batchUpdate: async (customers: any[]) => {
        console.log(`[Mock] Batch updating ${customers.length} customers`);
        return { success: true, updated: customers.length };
      },
    },
    clearbit: {
      enrich: async ({ domain }: any) => {
        return {
          companyName: `Company for ${domain}`,
          industry: "Technology",
          employees: Math.floor(Math.random() * 1000),
        };
      },
    },
  };
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock ATP Server running on http://localhost:${PORT}`);
});

export default app;
