import { IncomingHttpHeaders } from 'http';

/** Represents the result of a webstrip operation. */
export interface WebstripResult {
  /** The status code of the HTTP response. */
  statusCode: number;
  /** The headers of the HTTP response. */
  headers: IncomingHttpHeaders;
  /** The data stripped from the response. */
  data: string;
  /** The URL that was stripped. */
  url: string;
  /** The total number of redirects occurred. */
  redirectCount: number;
}
