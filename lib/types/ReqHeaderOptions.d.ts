export type HeaderInc = 'default' | 'random' | 'none';
/** Options for generating HTTP request headers. */
export interface ReqHeaderOptions {
    /**
     * Indicates what should be included in the "Accept-Language" header.
     * @default 'default'
     */
    language?: HeaderInc | 'any';
    /**
     * Indicates what should be included in the "Accept-Encoding" header.
     * @default 'default'
     */
    encoding?: HeaderInc | 'any';
    /**
     * Indicates what should be included in the "Accept" (MIME) header.
     * @default 'default'
     */
    mime?: HeaderInc | 'any';
    /**
     * Indicates what should be included in the "User-Agent" header.
     * @default 'default'
     */
    ua?: HeaderInc;
    /**
     * Indicates what should be included in the "Referer" header.
     * @default 'default'
     */
    referer?: HeaderInc;
    /**
     * Whether the response should not be cached.
     * @default true
     */
    noCache?: boolean;
    /**
     * Whether to upgrade insecure (HTTP) requests to secure (HTTPS) requests.
     * @default true
     */
    secure?: boolean;
    /**
     * Whether to enable the "Do Not Track" (DNT) header.
     * @default true
     */
    dnt?: boolean;
    /**
     * Whether to keep the connection alive.
     * `true` will set the "Connection" header to "keep-alive".
     * `false` will set the "Connection" header to "close".
     * Omitting this will not set the "Connection" header.
     * @default undefined
     */
    keepAlive?: boolean;
}
