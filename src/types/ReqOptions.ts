// own modules
import type { ReqHeaderOptions } from './ReqHeaderOptions.js';

/** Request options, shared by the HTTP and the browser modes. */
export interface ReqOptions {
  /**
   * Whether to follow redirects, or the maximum number of redirects to follow.
   * `true` follows up to 10 over HTTP and without limit in the browser.
   * @defaultValue `10`
   */
  followRedirects?: boolean | number;
  /**
   * Whether to throw when a redirect is met after the `followRedirects` limit
   * is reached. When `false`, the last (redirect) response is returned.
   * @defaultValue `true`
   */
  redirectError?: boolean;
  /**
   * Request header options. Auto-generated when omitted.
   * @defaultValue `undefined`
   */
  headerOptions?: ReqHeaderOptions;
}
