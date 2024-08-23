/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */

// dep modules
import { main } from '../src/cli.js';

export { main };
export interface CapturedOutput {
  stdout: string;
  stderr: string;
}

const captureConsoleOutput = async (fn: () => Promise<void>): Promise<CapturedOutput> => {
  let stdout = '';
  let stderr = '';

  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;
  const originalDebug = console.debug;

  console.log = (...logArgs: any[]) => {
    stdout += logArgs.join(' ') + '\n';
  };

  console.error = (...errorArgs: any[]) => {
    stderr += errorArgs.join(' ') + '\n';
  };

  console.warn = (...warnArgs: any[]) => {
    stdout += warnArgs.join(' ') + '\n';
  };

  console.info = (...infoArgs: any[]) => {
    stdout += infoArgs.join(' ') + '\n';
  };

  console.debug = (...debugArgs: any[]) => {
    stdout += debugArgs.join(' ') + '\n';
  };

  try {
    await fn();
  } finally {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
    console.info = originalInfo;
    console.debug = originalDebug;
  }

  return { stdout, stderr };
};

function parseArgs(input?: string): string[] {
  if (!input) return [];

  const args: string[] = [];
  let currentArg = '';
  let inQuotes = false;
  let quoteChar: string | null = null;

  for (const char of input) {
    if (char === ' ' && !inQuotes) {
      if (currentArg.length > 0) {
        args.push(currentArg);
        currentArg = '';
      }
    } else if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = null;
      args.push(currentArg);
      currentArg = '';
    } else {
      currentArg += char;
    }
  }

  if (currentArg.length > 0) {
    args.push(currentArg);
  }

  return args;
}

/**
 * Executes a command line interface (CLI) command captures the output. This is
 * done without using any `child_process` inorder to avoid spawning a new
 * process which will not be tracked by the test/coverage runner.
 *
 * @param strings - The template strings array.
 * @param values - The values to be interpolated into the template.
 * @returns A promise that resolves to the captured output.
 */
export const $ = async (strings: TemplateStringsArray, ...values: any[]): Promise<CapturedOutput> => {
  const args = strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '');
  return captureConsoleOutput(async () => {
    await main(parseArgs(args));
  });
};
