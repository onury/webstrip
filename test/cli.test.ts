// core modules
import { stripVTControlCharacters as plain } from 'node:util';

// dep modules
import puppeteer, { type Browser } from 'puppeteer';

// own modules
import { main } from '../src/cli.js';
import { acceptLanguages, userAgents } from '../src/utils/headers.js';
import { ERR_NO_URL, ERR_REDIRECT } from '../src/webstrip.js';
import { RENDERED, startServer, type TestServer } from './fixtures/server.js';

interface Run {
  code: number;
  stdout: string;
  stderr: string;
}

/** Runs the CLI in-process, capturing what it writes to the console. */
async function run(...args: string[]): Promise<Run> {
  let stdout = '';
  let stderr = '';
  const out = (...a: unknown[]): void => {
    stdout += `${a.join(' ')}\n`;
  };
  vi.spyOn(console, 'log').mockImplementation(out);
  vi.spyOn(console, 'info').mockImplementation(out);
  vi.spyOn(console, 'error').mockImplementation((...a: unknown[]) => {
    stderr += `${a.join(' ')}\n`;
  });
  try {
    const code = await main(args);
    return { code, stdout, stderr };
  } finally {
    vi.restoreAllMocks();
  }
}

let server: TestServer;
let base: string;

beforeAll(async () => {
  server = await startServer();
  base = server.url;
});

afterAll(async () => {
  await server.close();
});

describe('cli', () => {
  test('--help prints the styled help and exits 0', async () => {
    const { code, stdout, stderr } = await run('--help');
    expect(code).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toMatchSnapshot();
  });

  test('exits 2 with the help when no URL is given', async () => {
    const { code, stdout, stderr } = await run();
    expect(code).toBe(2);
    expect(plain(stderr)).toBe(`Error: ${ERR_NO_URL}\n`);
    expect(stderr).toContain('\x1b[');
    expect(plain(stdout)).toContain('$ webstrip <url> [options]');
  });

  test('defaults to process.argv', async () => {
    const argv = process.argv;
    process.argv = [argv[0] as string, 'webstrip'];
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      // the first two (node and the script) are not arguments
      expect(await main()).toBe(2);
      expect(plain(String(log.mock.calls[0]?.[0]))).toContain('$ webstrip <url> [options]');
    } finally {
      process.argv = argv;
      vi.restoreAllMocks();
    }
  });

  test('prints the result as text', async () => {
    const json = JSON.parse((await run(`${base}/page`, '-o', 'json')).stdout);
    const { code, stdout, stderr } = await run(`${base}/page`);
    expect(code).toBe(0);
    expect(stderr).toBe('');
    const lines = plain(stdout).split('\n');
    expect(lines.slice(0, 5)).toEqual([
      `Request URL   : ${base}/page`,
      'Status Code   : 200',
      'Redirect Count: 0',
      '',
      'Response Headers:'
    ]);
    const width = Math.max(...Object.keys(json.headers).map((k) => k.length));
    expect(lines).toContain(`${'x-a'.padEnd(width)}: 1`);
    expect(lines).toContain(`${'x-longer-header'.padEnd(width)}: 2`);
    expect(plain(stdout)).toContain(`\nResponse Body:\n${json.data}\n`);
    expect(stdout).toContain('\x1b[36mRequest URL   :\x1b[39m');
  });

  test('--output json prints the result as JSON only', async () => {
    const { code, stdout } = await run(`${base}/r/1`, '--output', 'json');
    expect(code).toBe(0);
    const result = JSON.parse(stdout);
    expect(result).toMatchObject({ statusCode: 200, redirectCount: 1, url: `${base}/r/0` });
    expect(stdout).toBe(`${JSON.stringify(result, null, 2)}\n`);
  });

  test('sends the default headers, and no-cache unless --cache is set', async () => {
    const sent = async (...flags: string[]): Promise<Record<string, string>> =>
      JSON.parse(JSON.parse((await run(`${base}/headers`, '-o', 'json', ...flags)).stdout).data);

    const defaults = await sent();
    expect(defaults['user-agent']).toBe(userAgents[0]);
    expect(defaults['accept-language']).toBe(acceptLanguages[0]);
    expect(defaults['cache-control']).toMatch(/no-cache/);
    expect(defaults.dnt).toBe('1');
    expect(defaults['upgrade-insecure-requests']).toBe('1');
    expect(defaults).not.toHaveProperty('connection', 'close');

    expect((await sent('--no-cache'))['cache-control']).toMatch(/no-cache/);
    expect(await sent('--cache')).not.toHaveProperty('cache-control');
  });

  test('maps the header flags', async () => {
    const { stdout } = await run(
      `${base}/headers`,
      '-o',
      'json',
      '--ua',
      'none',
      '--referer',
      'random',
      '--language',
      'any',
      '--encoding',
      'none',
      '--mime',
      'any',
      '--no-secure',
      '--no-dnt',
      '--no-keep-alive'
    );
    expect(JSON.parse(stdout).reqHeaders).toStrictEqual({
      'Accept-Language': '*',
      Accept: '*/*',
      Referer: expect.stringMatching(/^https:\/\//),
      Connection: 'close',
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      Pragma: 'no-cache',
      Expires: '0'
    });
    const keepAlive = await run(`${base}/headers`, '-o', 'json', '--keep-alive');
    expect(JSON.parse(keepAlive.stdout).reqHeaders.Connection).toBe('keep-alive');
  });

  test('boolean flags do not take a value', async () => {
    for (const flag of ['--cache', '--secure', '--dnt', '--keep-alive', '--redirect-error']) {
      const { code, stdout } = await run(flag, `${base}/page`, '-o', 'json');
      expect(code).toBe(0);
      expect(JSON.parse(stdout).statusCode).toBe(200);
    }
  });

  test('--follow-redirects and --redirect-error', async () => {
    const failed = await run(`${base}/r/3`, '-f', '1');
    expect(failed.code).toBe(1);
    expect(plain(failed.stderr)).toBe(`Error: ${ERR_REDIRECT}\n`);
    expect(failed.stderr).toContain('\x1b[');

    const last = await run(`${base}/r/3`, '-f', '1', '--no-redirect-error', '-o', 'json');
    expect(last.code).toBe(0);
    expect(JSON.parse(last.stdout)).toMatchObject({ statusCode: 302, redirectCount: 1 });

    const defaults = await run(`${base}/r/10`, '-o', 'json');
    expect(JSON.parse(defaults.stdout).redirectCount).toBe(10);
  });

  test('--wait-until uses the browser', async () => {
    const { stdout } = await run(`${base}/page`, '-w', 'load', '-o', 'json');
    expect(JSON.parse(stdout).data).toContain(RENDERED);
  });

  test('--eval runs (and awaits) a script before the content is read', async () => {
    const script =
      'new Promise(r => setTimeout(() => { document.body.innerHTML = "<p>evaluated</p>"; r(); }, 200))';
    const { code, stdout } = await run(`${base}/page`, '--eval', script, '-o', 'json');
    expect(code).toBe(0);
    expect(JSON.parse(stdout).data).toContain('<body><p>evaluated</p></body>');
  });

  describe('--navigate', () => {
    function spyLaunch(): Browser[] {
      const launch = puppeteer.launch.bind(puppeteer);
      const browsers: Browser[] = [];
      vi.spyOn(puppeteer, 'launch').mockImplementation(async (opts) => {
        expect(opts?.headless).toBe(false);
        // a visible window cannot open in CI
        const browser = await launch({ ...opts, headless: true });
        browsers.push(browser);
        return browser;
      });
      return browsers;
    }

    test('with seconds, auto-closes the browser', async () => {
      const launch = puppeteer.launch.bind(puppeteer);
      const spy = vi
        .spyOn(puppeteer, 'launch')
        .mockImplementation((opts) => launch({ ...opts, headless: true }));
      const start = Date.now();
      const { code } = await runKeepingSpies(`${base}/page`, '-n', '1');
      expect(code).toBe(0);
      expect(Date.now() - start).toBeGreaterThanOrEqual(1000);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ headless: false }));
    });

    test('bare, waits for the page to be closed', async () => {
      const browsers = spyLaunch();
      const timer = setInterval(async () => {
        try {
          const [page] = (await browsers[0]?.pages()) ?? [];
          if (page && (await page.evaluate('document.readyState')) === 'complete') {
            clearInterval(timer);
            await page.close();
          }
        } catch {
          // the page is still navigating; try again on the next tick
        }
      }, 100);
      const { code, stdout } = await runKeepingSpies(`${base}/page`, '--navigate', '-o', 'json');
      clearInterval(timer);
      expect(code).toBe(0);
      expect(JSON.parse(stdout).data).toContain(RENDERED);
    });
  });

  test('exits 1 on a failed strip', async () => {
    const { code, stderr } = await run('http://webstrip-test.invalid/');
    expect(code).toBe(1);
    expect(plain(stderr)).toMatch(/^Error: Address not found at /);
  });

  test('rejects unknown flags', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`exit ${code}`);
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(main([`${base}/page`, '--unknown'])).rejects.toThrow('exit 2');
    expect(exit).toHaveBeenCalledWith(2);
    vi.restoreAllMocks();
  });
});

/** Like run(), but leaves spies set up by the test in place until it returns. */
async function runKeepingSpies(...args: string[]): Promise<Run> {
  let stdout = '';
  const log = vi.spyOn(console, 'log').mockImplementation((...a) => {
    stdout += `${a.join(' ')}\n`;
  });
  const info = vi.spyOn(console, 'info').mockImplementation((...a) => {
    stdout += `${a.join(' ')}\n`;
  });
  try {
    const code = await main(args);
    return { code, stdout, stderr: '' };
  } finally {
    log.mockRestore();
    info.mockRestore();
    vi.restoreAllMocks();
  }
}
