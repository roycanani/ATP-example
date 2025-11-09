import { VM } from "vm2";
import { createApiMock } from "./mockApis.js";
import { createAtpHelpers } from "./atpHelpers.js";

/**
 * Execute code in an isolated sandbox environment
 * Provides access to mock APIs and ATP multi-level agent tools
 *
 * @param code - JavaScript code to execute
 * @param timeout - Execution timeout in milliseconds (default: 5000)
 * @returns Result of the code execution
 */
export async function executeCode(
  code: string,
  timeout: number = 15000
): Promise<any> {
  const vm = new VM({
    timeout,
    sandbox: {
      api: createApiMock(),
      atp: createAtpHelpers(),
      Promise,
      console: {
        log: (...args: any[]) => console.log("[Sandbox]", ...args),
      },
    },
  });

  return await vm.run(code);
}
