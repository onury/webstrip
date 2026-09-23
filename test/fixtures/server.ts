// core modules
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { brotliCompressSync, deflateSync, gzipSync } from 'node:zlib';

/**
 * A page whose script adds `<p id="js">rendered</p>` to the DOM. The markup is
 * split in the script source, so only a browser-rendered page contains it.
 */
export const PAGE = `<!DOCTYPE html><html><head><title>Test Page</title></head><body>
<h1>webstrip</h1>
<script>document.body.insertAdjacentHTML('beforeend', '<p id="j' + 's">rendered</p>');</script>
</body></html>`;

/** Marker that exists only in the browser-rendered DOM of {@link PAGE}. */
export const RENDERED = '<p id="js">rendered</p>';

/** A page that fetches more content after its load event (for networkidle). */
const LATE_PAGE = `<!DOCTYPE html><html><head><title>Late</title></head><body>
<script>
window.addEventListener('load', () => setTimeout(() => {
  fetch('/text').then(r => r.text()).then(t => {
    document.body.insertAdjacentHTML('beforeend', '<p id="la' + 'te">' + t + '</p>');
  });
}, 50));
</script>
</body></html>`;

/** A page that holds its load event back with a slow image. */
const SLOW_PAGE = `<!DOCTYPE html><html><head><title>Slow</title></head><body>
<img src="/slow.png"></body></html>`;

/** A page with a sub-resource, so request interception sees non-navigation requests. */
const IMAGE_PAGE = `<!DOCTYPE html><html><head><title>Image</title></head><body>
<img src="/img.png"></body></html>`;

// 1x1 transparent PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

function html(
  res: http.ServerResponse,
  body: string,
  headers: http.OutgoingHttpHeaders = {}
): void {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', ...headers });
  res.end(body);
}

function route(req: http.IncomingMessage, res: http.ServerResponse): void {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const [, name = '', arg = ''] = url.pathname.split('/');

  switch (name) {
    case 'page':
      return html(res, PAGE, { 'x-a': '1', 'x-longer-header': '2' });
    case 'late':
      return html(res, LATE_PAGE);
    case 'slow':
      return html(res, SLOW_PAGE);
    case 'image':
      return html(res, IMAGE_PAGE);
    case 'text':
      res.writeHead(200, { 'content-type': 'text/plain' });
      return void res.end('late content');
    case 'img.png':
      res.writeHead(200, { 'content-type': 'image/png' });
      return void res.end(PNG);
    case 'slow.png':
      setTimeout(() => {
        res.writeHead(200, { 'content-type': 'image/png' });
        res.end(PNG);
      }, 1500);
      return;
    case 'headers':
      // echoes the request headers
      res.writeHead(200, { 'content-type': 'application/json' });
      return void res.end(JSON.stringify(req.headers));
    case 'utf8':
      return html(res, '<p>çğıöşü — 日本語 — 🔆</p>');
    case 'encoded': {
      // /encoded/<gzip|x-gzip|deflate|br|broken>
      const body = Buffer.from('<p>decoded</p>');
      const encoded: Record<string, Buffer> = {
        gzip: gzipSync(body),
        'x-gzip': gzipSync(body),
        deflate: deflateSync(body),
        br: brotliCompressSync(body),
        broken: Buffer.from('not gzip at all')
      };
      res.writeHead(200, {
        'content-type': 'text/html',
        'content-encoding': arg === 'broken' ? 'gzip' : arg
      });
      return void res.end(encoded[arg]);
    }
    case 'r': {
      // /r/<n>?code=302&abs=1 → redirects n times, then serves PAGE
      const n = Number(arg);
      if (n <= 0) return html(res, PAGE);
      const code = Number(url.searchParams.get('code') ?? 302);
      const next = `/r/${n - 1}${url.search}`;
      const location = url.searchParams.has('abs') ? `http://${req.headers.host}${next}` : next;
      res.writeHead(code, { location, 'content-type': 'text/html' });
      return void res.end(`<p>redirect ${n}</p>`);
    }
    case 'no-location':
      res.writeHead(301, { 'content-type': 'text/html' });
      return void res.end('<p>moved nowhere</p>');
    case 'reset':
      // sends headers, then kills the connection mid-body
      res.writeHead(200, { 'content-type': 'text/html', 'content-length': '1000' });
      res.write('<p>partial');
      setTimeout(() => res.socket?.destroy(), 20);
      return;
    default:
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
  }
}

export interface TestServer {
  /** Base URL, e.g. `http://127.0.0.1:54321`. */
  url: string;
  close(): Promise<void>;
}

/** Starts the local fixture server on a random port. */
export async function startServer(): Promise<TestServer> {
  const server = http.createServer(route);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      })
  };
}

/** A URL on a closed port, for connection-refused errors. */
export async function closedPortUrl(): Promise<string> {
  const server = http.createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return `http://127.0.0.1:${port}`;
}
