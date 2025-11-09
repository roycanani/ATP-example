import "dotenv/config";
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { VM } from "vm2";
import { orchestratorAgent } from "./agents/orchestrator.js";
import { createApiMock } from "./utils/sandbox.js";

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

app.post("/api/test", async (req: Request, res: Response) => {
  console.log("-----------------------");
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  try {
    console.log("Received question:", question);

    const result = await orchestratorAgent(question);

    console.log("Answer:", result.answer);

    res.json({
      success: true,
      question,
      ...result,
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
        api: createApiMock(),
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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock ATP Server running on http://localhost:${PORT}`);
});

export default app;
