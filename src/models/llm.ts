import "dotenv/config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Initialize the LLM model
export const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  maxOutputTokens: 2048,
});

// Helper to invoke the model and extract text response
export async function invokeModel(prompt: string): Promise<string> {
  const response: any = await (model as any).invoke(prompt);
  const text =
    typeof response === "string"
      ? response
      : response.content || response.text || JSON.stringify(response);
  return text;
}
