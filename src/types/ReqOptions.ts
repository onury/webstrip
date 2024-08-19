import { ReqHeaderOptions } from './ReqHeaderOptions.js';

/** HTTP request options. */
export interface ReqOptions {
  /**
   * Whether to follow redirects.
   * Or specify the maximum number of redirects to follow.
   * @default 10
   */
  followRedirects?: boolean | number;
  /**
   * Whether to throw an error when a redirect is encountered after
   * `followRedirects` limit is reached. If `false`, the last response will be
   * returned within the result.
   * @default true
   */
  redirectError?: boolean;
  /**
   * Request header options.
   */
  headerOptions?: ReqHeaderOptions;
}
