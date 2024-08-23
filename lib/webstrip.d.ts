import { WebstripOptions } from './types/WebstripOptions.js';
import { WebstripResult } from './types/WebstripResult.js';
export declare const ERR_NO_URL = "No URL is provided!";
export declare const ERR_REDIRECT = "Too many redirects!";
export declare const ERR_NO_RESPONSE = "No response from ";
export declare const ERR_NOT_FOUND = "Address not found at ";
export declare const DEFAULT_REDIRECTS = 10;
/**
 * Scrapes the specified URL and returns the result.
 * @param url - The URL to strip.
 * @param [reqOptions] - Optional request header options.
 * @returns - A promise that resolves to the webstrip result.
 */
export declare function webstrip(url: string, options?: WebstripOptions): Promise<WebstripResult>;
