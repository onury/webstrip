// core modules
import type { IncomingHttpHeaders, OutgoingHttpHeaders } from 'node:http';

/** The result of a webstrip call. */
export interface WebstripResult {
  /** The generated request headers that were sent. */
  reqHeaders: OutgoingHttpHeaders;
  /** The HTTP status code of the (last) response. */
  statusCode: number;
  /** The response headers received. */
  headers: IncomingHttpHeaders;
  /** The response body, or the page content in browser mode. */
  data: string;
  /** The final URL, after any redirects. */
  url: string;
  /** The number of redirects followed. */
  redirectCount: number;
}
