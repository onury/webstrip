import { OutgoingHttpHeaders } from 'node:http';
import { ReqHeaderOptions } from './types/ReqHeaderOptions.js';
export declare const REDIRECT_CODES: number[];
/**
 * Special list of user agents for emulating a browser and avoiding getting
 * blocked.
 */
export declare const userAgents: string[];
export declare const referers: string[];
export declare const acceptLanguages: string[];
export declare const acceptEncodings: string[];
export declare const acceptMimes: string[];
/**
 * Returns a random item from the given list.
 * @param list - The list of items.
 */
export declare function randomItem<T>(list: T[]): T;
/**
 * Returns a random "User-Agent" header string for emulating a browser and
 * avoiding getting blocked.
 */
export declare function getRandomUserAgent(): string;
/**
 * Returns a random "Accept-Language" header string for emulating a browser.
 */
export declare function getRandomAcceptLanguage(): string;
/**
 * Returns a random "Accept-Encoding" header string for emulating a browser.
 */
export declare function getRandomAcceptEncoding(): string;
/**
 * Returns a random "Accept" (MIME) header string for emulating a browser.
 */
export declare function getRandomAccept(): string;
/**
 * Returns a set of request headers for emulating a browser and avoiding
 * getting blocked.
 * @param [opts] - Request header options.
 */
export declare function getReqHeaders(opts?: ReqHeaderOptions): OutgoingHttpHeaders;
/**
 * Builds the request headers for HTTP requests.
 * @param [reqOptions] - Optional request header options.
 */
export declare function buildReqHeaders(reqOptions?: ReqHeaderOptions): OutgoingHttpHeaders;
