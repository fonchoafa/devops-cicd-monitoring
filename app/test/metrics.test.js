'use strict';

const os = require('node:os');
const path = require('node:path');
process.env.ADMIN_KEY = 'test-admin-key';
process.env.LOG_SILENT = '1';
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `cloud-notes-metrics-test-${process.pid}`);
delete process.env.TABLE_NAME;
delete process.env.BUCKET_NAME;
delete process.env.SECRET_PARAM_NAME;
delete process.env.NOTES_FILE;

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { buildApp } = require('../server');
const { createNoteStore, createFileStore } = require('../lib/store');

let server;
let base;

before(async () => {
  const app = buildApp({ notes: createNoteStore(), files: createFileStore() });
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const metrics = async () => (await fetch(`${base}/metrics`)).text();

test('/metrics serves the Prometheus text format', async () => {
  await fetch(`${base}/health`);
  await fetch(`${base}/health`);
  const res = await fetch(`${base}/metrics`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /^text\/plain/);
  const body = await res.text();
  assert.match(body, /# TYPE http_requests_total counter/);
  assert.match(body, /http_requests_total\{method="GET",route="\/health",status="200"\} 2/);
  assert.match(body, /http_request_duration_seconds_bucket\{method="GET",route="\/health",le="\+Inf"\} 2/);
  assert.match(body, /http_request_duration_seconds_count\{method="GET",route="\/health"\} 2/);
  assert.match(body, /process_uptime_seconds \d+/);
  assert.match(body, /process_resident_memory_bytes \d+/);
  assert.match(body, /app_info\{version="1\.0\.0"\} 1/);
});

test('errors are counted with their status and the route pattern, not the raw URL', async () => {
  const bad = await fetch(`${base}/api/notes/not-a-uuid/attachment`);
  assert.equal(bad.status, 400);
  const missing = await fetch(`${base}/no-such-page`);
  assert.equal(missing.status, 404);
  const body = await metrics();
  assert.match(body, /http_requests_total\{method="GET",route="\/api\/notes\/:id\/attachment",status="400"\} 1/);
  assert.match(body, /http_requests_total\{method="GET",route="other",status="404"\} 1/);
  assert.ok(!body.includes('not-a-uuid'), 'raw URLs must not become labels');
});

test('scraping /metrics is not counted as traffic', async () => {
  await metrics();
  await metrics();
  assert.ok(!(await metrics()).includes('route="/metrics"'));
});
