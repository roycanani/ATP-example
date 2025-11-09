import { invokeModel } from "../models/llm.js";
import { executeCode } from "../utils/sandbox.js";

/**
 * Code Executor Agent - Generates and executes code
 *
 * @param task - Specific task description to generate code for
 * @returns Object containing generated code and execution result
 */
export async function codeExecutorAgent(task: string): Promise<{
  generatedCode: string;
  result: any;
}> {
  const codeGenPrompt = `You are a code generation agent. Write JavaScript code to solve this specific task.

Available APIs:
- api.github.listPRs({ repo, state }) - Returns array of PRs with {number, title, state, checks}
- api.github.getDiff({ prNumber }) - Returns diff string for a PR
- api.github.postComment({ prNumber, body }) - Posts comment on PR
- api.email.list({ limit, assignee }) - Lists emails with {id, subject, from, assignee, content}
- api.email.send({ to, subject, body }) - Sends an email
- api.slack.postMessage({ channel, text }) - Posts message to Slack channel
- api.crm.getCustomers({ limit }) - Gets CRM customers
- api.crm.batchUpdate(customers) - Batch updates customers
- api.clearbit.enrich({ domain }) - Enriches company data by domain

Task: ${task}

IMPORTANT Rules:
- Write ONLY executable JavaScript code, no explanations
- The last expression will be automatically returned
- Use async/await for API calls
- If you define a function, call it at the end

Examples:
- "strawberry".split('').filter(c => c === 'r').length
- (async () => { const prs = await api.github.listPRs({ repo: 'company/product', state: 'open' }); return prs.filter(pr => pr.checks === 'failing'); })()

Write the code now:`;

  const text = await invokeModel(codeGenPrompt);

  // Extract code from markdown if present
  const generatedCode = text
    .replace(/```javascript\n?/g, "")
    .replace(/```js\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  console.log("[Code Executor Agent] Generated code:", generatedCode);

  // Execute the code in sandbox
  const result = await executeCode(generatedCode);
  console.log("[Code Executor Agent] Execution result:", result);

  return { generatedCode, result };
}
