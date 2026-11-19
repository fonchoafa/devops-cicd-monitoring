# 3. Monitoring and observability

**Monitoring** tells you *whether* the system is healthy. **Observability** is being able to ask *why* when it is not. You get there with three kinds of signals:

| Signal | Question it answers | In this project |
| --- | --- | --- |
| **Logs** | What happened, in detail? | One JSON line per request (`docker compose logs app`) |
| **Metrics** | How is it doing over time, in numbers? | `/metrics`, scraped by Prometheus |
| **Traces** | Where did one request spend its time across services? | Not covered (needs several services and a tracing tool) |

Plus a simple **health check** (`/health`) that answers "is it alive?" for Docker, the pipeline and load balancers.

```
 app (Node.js)                              Prometheus                      You
 +-------------------+   scrape /metrics    +--------------------+   queries +---------+
 | JSON logs (stdout)|   every 5 seconds    | stores time series | <-------- | browser |
 | /health           | <------------------- | evaluates alerts   |   :9090   +---------+
 | /metrics          |                      +--------------------+
 +-------------------+
```

## What the app exposes

**Logs.** Each request is one JSON line with time, level, method, path, status, duration in ms and client IP. JSON is easy for tools to search and filter. Scrapes of `/metrics` are not logged so the log stays readable.

```powershell
docker compose logs -f app
```

**Health.** `GET /health` returns `{"status":"ok", ... }`. The Dockerfile's `HEALTHCHECK` calls it every 15 seconds, and `docker compose ps` shows `healthy` or `unhealthy`.

**Metrics.** `GET /metrics` returns numbers in the Prometheus text format:

| Metric | Type | Meaning |
| --- | --- | --- |
| `http_requests_total{method,route,status}` | counter | How many requests, by route pattern and status code |
| `http_request_duration_seconds_*` | histogram | How long requests took, in buckets |
| `process_uptime_seconds` | gauge | Seconds since the app started |
| `process_resident_memory_bytes` | gauge | Memory used by the process |
| `nodejs_heap_used_bytes` | gauge | JavaScript heap in use |
| `app_info{version}` | gauge | Which version is running |

Metric types: a **counter** only goes up (use `rate()` to see per-second change), a **gauge** goes up and down, a **histogram** counts observations into buckets so you can compute percentiles.

The `route` label is the **pattern** (`/api/notes/:id`), not the real URL. If it held real URLs, every note id would create a new time series and memory would grow without limit (high cardinality).

## Try it

Start everything (see the [run guide](04-run-guide.md)):

```powershell
docker compose up -d --build
```

1. Make some traffic:
   ```powershell
   1..30 | ForEach-Object { curl.exe -s http://localhost:3000/health | Out-Null }
   1..5  | ForEach-Object { curl.exe -s http://localhost:3000/nope | Out-Null }   # 404s
   ```
2. Read the raw metrics: `curl.exe http://localhost:3000/metrics`
3. Open **http://localhost:9090/targets** and check the `cloud-notes` target is **UP**.
4. Open **http://localhost:9090/graph** and run these queries (type, press **Execute**, open the **Graph** tab):

| Query | Shows |
| --- | --- |
| `up` | 1 when the app is reachable, 0 when not |
| `http_requests_total` | request counts by route and status |
| `sum by (route) (rate(http_requests_total[1m]))` | requests per second for each route |
| `sum(rate(http_requests_total{status=~"5.."}[1m]))` | errors per second (5xx) |
| `histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[1m])))` | the time within which 95% of requests finish |
| `process_resident_memory_bytes / 1024 / 1024` | app memory in MB |

5. Quick terminal view without Prometheus:
   ```powershell
   .\scripts\monitor.ps1 -Count 10 -IntervalSeconds 2
   ```

## Alerts

[monitoring/alerts.yml](../monitoring/alerts.yml) defines three rules, shown at **http://localhost:9090/alerts**:

| Alert | Fires when | Why it matters |
| --- | --- | --- |
| `AppDown` | the app cannot be scraped for 30 s | users cannot reach the service |
| `HighErrorRate` | more than 5% of requests are 5xx for 1 min | the app is failing |
| `SlowRequests` | p95 latency above 0.5 s for 2 min | users are waiting too long |

Trigger the first one on purpose:

```powershell
docker compose stop app
```

Wait about a minute and refresh `/alerts`: **AppDown** moves from pending to **firing**. Then bring it back with `docker compose start app` and watch it clear. (Prometheus shows alerts; sending them by e-mail or chat needs **Alertmanager**, which this project does not run.)

## Limits and next steps

- `/metrics` is open for the demo. In production, keep it on a private network or protect it.
- Prometheus here keeps 2 days of data in a Docker volume, which is enough for a demo.
- Next steps: Grafana dashboards, Alertmanager notifications, central log storage, and tracing.
- In Module 3 the same ideas ran on AWS: logs and metrics went to CloudWatch and alarms e-mailed through SNS. Prometheus is the open-source, container-friendly equivalent.
