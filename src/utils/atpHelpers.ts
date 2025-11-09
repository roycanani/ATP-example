import { invokeModel } from "../models/llm.js";

/**
 * Create ATP helpers for multi-level agents
 * Provides tools for spawning sub-agents within code execution
 */
export function createAtpHelpers() {
  return {
    llm: {
      /**
       * Call a sub-agent to process a task
       * Supports both text responses and structured data extraction
       *
       * @param prompt - The task description
       * @param schema - Optional JSON schema for structured data extraction
       * @returns Text result { result: string } or structured data matching schema
       */
      call: async (prompt: string, schema?: any) => {
        if (schema) {
          // Structured data extraction mode
          console.log(`[ATP Sub-Agent] Extracting with schema:`, schema);
          const extractPrompt = `${prompt}\n\nReturn ONLY valid JSON matching this schema: ${JSON.stringify(
            schema
          )}\nDo not include any explanations, just the JSON.`;
          const result = await invokeModel(extractPrompt);

          try {
            // Try to parse JSON from the response
            const cleanResult = result
              .replace(/```json\n?/g, "")
              .replace(/```\n?/g, "")
              .trim();
            return JSON.parse(cleanResult);
          } catch (error) {
            console.warn(
              "[ATP Sub-Agent] Failed to parse JSON, returning raw result"
            );
            return { extracted: result.trim(), schema };
          }
        } else {
          // Simple text processing mode
          console.log(
            `[ATP Sub-Agent] Processing: ${prompt.substring(0, 100)}...`
          );
          const result = await invokeModel(prompt);
          return { result: result.trim() };
        }
      },
    },
  };
}
