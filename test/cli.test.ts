// own modules
import { ERR_NO_URL } from '../src/webstrip.js';
import { $, main } from './helper.js';

describe('cli', () => {

  test('cli main fn', async () => {
    expect((await main())).toBeTypeOf('function');
  });

  test('no URL', async () => {
    expect((await $``).stderr).toMatch(ERR_NO_URL);
  });

  test('--help', async () => {
    const { stdout, stderr } = await $`--help`;
    expect(stderr).toBe('');
    expect(stdout.toLowerCase()).toMatch('examples');
  });

  test('url & no flags', async () => {
    const { stdout, stderr } = await $`https://example.com`;
    expect(stderr).toBe('');
    expect(stdout.toLowerCase()).toMatch('<!doctype html>');
  });

  test('--output json', async () => {
    const { stdout, stderr } = await $`https://example.com --output json`;
    expect(stderr).toBe('');
    expect(() => JSON.parse(stdout.trim())).not.toThrow();
    expect(JSON.parse(stdout.trim())).toBeTypeOf('object');
  });

  test('--navigate', async () => {
    const { stdout, stderr } = await $`https://example.com --navigate 2`;
    expect(stderr).toBe('');
    expect(stdout.toLowerCase()).toMatch('<!doctype html>');
  });

  test('--eval', async () => {
    const { stdout, stderr } = await $`https://example.com --eval 'document.body.innerHTML="testing cli"'`;
    expect(stderr).toBe('');
    expect(stdout).toMatch('testing cli');
  });

  test('unknown flag', async () => {
    expect(() => $`https://example.com --unknown`).rejects.toThrow();
  });

});
