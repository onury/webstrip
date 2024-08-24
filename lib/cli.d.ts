#! /usr/bin/env node
type ExitFn = () => never;
/**
 * The main function of the webstrip CLI.
 *
 * @param args - Optional array of string arguments.
 * @returns A promise that resolves to an exit function.
 */
export declare function main(args?: string[]): Promise<ExitFn>;
export {};
