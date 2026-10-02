import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

test('the vendored adapter exactly matches its reviewed source digest', () => {
  const directory = new URL('../src/lib/website-adapter/', import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL('SOURCE.json', directory), 'utf8'));
  for (const [file, expected] of Object.entries(manifest.sha256)) {
    assert.equal(createHash('sha256').update(readFileSync(new URL(file, directory))).digest('hex'), expected, file);
  }
});

test('the retry worker is opt-in and stops safely without configuration', () => {
  const run = spawnSync(process.execPath, ['scripts/growthos-worker.mjs'], {
    cwd: new URL('../', import.meta.url), encoding: 'utf8', timeout: 5000,
    env: { NODE_ENV: 'test', GROWTHOS_WORKER_ENABLED: 'false' }, windowsHide: true,
  });
  assert.equal(run.status, 1);
  assert.equal(run.stdout, '');
  assert.match(run.stderr, /worker is disabled/);
});
