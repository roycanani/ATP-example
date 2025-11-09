import { invokeModel } from "../models/llm.js";
import { codeExecutorAgent } from "./codeExecutor.js";

interface OrchestratorResponse {
  type: "direct_answer" | "code_execution";
  answer: string;
  task?: string;
  generatedCode?: string;
  executionResult?: any;
}

/**
 * Orchestrator Agent - Main decision maker
 *
 * Decides whether to answer directly or delegate to code executor agent
 *
 * @param question - User's question
 * @returns Response object with answer and execution details
 */
export async function orchestratorAgent(
  question: string
): Promise<OrchestratorResponse> {
  const orchestratorPrompt = `You are an orchestrator AI agent. You can either answer questions directly or delegate tasks to a code execution agent.

Available tool:
- CODE_EXECUTOR: Can write and execute code to interact with APIs, perform computations, or process data

User question: ${question}

Decide the best approach:
1. If it's a simple question (greetings, explanations, general knowledge) - answer directly
2. If it requires API calls, data processing, or complex computation - use CODE_EXECUTOR

Respond in this EXACT format:

If answering directly:
ANSWER: <your answer here>

If using code executor:
USE_TOOL: CODE_EXECUTOR
TASK: <describe the specific task for the code executor>

Example:
User: "How many r's in strawberry?"
USE_TOOL: CODE_EXECUTOR
TASK: Count the number of times the letter 'r' appears in the word "strawberry"`;

  const text = await invokeModel(orchestratorPrompt);
  console.log("[Orchestrator Agent] Decision:", text);

  // Parse orchestrator decision
  if (text.includes("USE_TOOL: CODE_EXECUTOR")) {
    // Extract the task description
    const taskMatch = text.match(/TASK:\s*(.+?)(?:\n|$)/i);
    const task = taskMatch ? taskMatch[1].trim() : question;

    console.log(
      "[Orchestrator Agent] Delegating to Code Executor with task:",
      task
    );

    // Delegate to code executor agent
    const { generatedCode, result } = await codeExecutorAgent(task);

    // Orchestrator interprets the result
    const interpretPrompt = `You delegated a task to a code executor and received this result:

Task: ${task}
Result: ${JSON.stringify(result)}

Provide a clear, user-friendly answer to the original question: "${question}"

Your response:`;

    const finalAnswer = await invokeModel(interpretPrompt);

    return {
      type: "code_execution",
      task,
      generatedCode,
      executionResult: result,
      answer: finalAnswer.trim(),
    };
  } else {
    // Direct answer
    const answer = text.replace(/^ANSWER:\s*/i, "").trim();
    return {
      type: "direct_answer",
      answer,
    };
  }
}
