'use strict';

// Tiny, dependency-free metrics in the Prometheus text format.
// Prometheus (or curl) reads them from GET /metrics.
//
//   http_requests_total            counter    requests by method, route and status
//   http_request_duration_seconds  histogram  how long requests took
//   process_* / nodejs_*           gauges     uptime and memory
//
// "route" is the route PATTERN (/api/notes/:id), not the real URL, so the number of
// label combinations stays small no matter how many notes exist.

const BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5];

const requests = new Map(); // "METHOD|route|status" -> count
const durations = new Map(); // "METHOD|route" -> { counts: [per bucket], sum, count }

function observe({ method, route, status, seconds }) {
  const reqKey = `${method}|${route}|${status}`;
  requests.set(reqKey, (requests.get(reqKey) || 0) + 1);

  const durKey = `${method}|${route}`;
  let d = durations.get(durKey);
  if (!d) {
    d = { counts: BUCKETS.map(() => 0), sum: 0, count: 0 };
    durations.set(durKey, d);
  }
  BUCKETS.forEach((upper, i) => {
    if (seconds <= upper) d.counts[i] += 1;
  });
  d.sum += seconds;
  d.count += 1;
}

const esc = (v) => String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
const labels = (obj) =>
  '{' +
  Object.entries(obj)
    .map(([k, v]) => `${k}="${esc(v)}"`)
    .join(',') +
  '}';

function middleware(req, res, next) {
  if (req.path === '/metrics') return next(); // do not count the scrapes themselves
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    // req.route is set once Express has matched a route; static files and 404s have none.
    const route = req.route ? (req.baseUrl || '') + req.route.path : 'other';
    observe({
      method: req.method,
      route,
      status: res.statusCode,
      seconds: Number(process.hrtime.bigint() - start) / 1e9,
    });
  });
  next();
}

function render({ version = 'unknown' } = {}) {
  const out = [];

  out.push('# HELP http_requests_total Total HTTP requests handled.');
  out.push('# TYPE http_requests_total counter');
  for (const [key, count] of requests) {
    const [method, route, status] = key.split('|');
    out.push(`http_requests_total${labels({ method, route, status })} ${count}`);
  }

  out.push('# HELP http_request_duration_seconds HTTP request duration in seconds.');
  out.push('# TYPE http_request_duration_seconds histogram');
  for (const [key, d] of durations) {
    const [method, route] = key.split('|');
    BUCKETS.forEach((upper, i) => {
      out.push(`http_request_duration_seconds_bucket${labels({ method, route, le: upper })} ${d.counts[i]}`);
    });
    out.push(`http_request_duration_seconds_bucket${labels({ method, route, le: '+Inf' })} ${d.count}`);
    out.push(`http_request_duration_seconds_sum${labels({ method, route })} ${d.sum}`);
    out.push(`http_request_duration_seconds_count${labels({ method, route })} ${d.count}`);
  }

  const mem = process.memoryUsage();
  out.push('# HELP process_uptime_seconds Seconds since the app started.');
  out.push('# TYPE process_uptime_seconds gauge');
  out.push(`process_uptime_seconds ${Math.round(process.uptime())}`);
  out.push('# HELP process_resident_memory_bytes Resident memory size in bytes.');
  out.push('# TYPE process_resident_memory_bytes gauge');
  out.push(`process_resident_memory_bytes ${mem.rss}`);
  out.push('# HELP nodejs_heap_used_bytes Used V8 heap in bytes.');
  out.push('# TYPE nodejs_heap_used_bytes gauge');
  out.push(`nodejs_heap_used_bytes ${mem.heapUsed}`);
  out.push('# HELP app_info Static information about the running app.');
  out.push('# TYPE app_info gauge');
  out.push(`app_info${labels({ version })} 1`);

  return out.join('\n') + '\n';
}

module.exports = { middleware, render, observe };
