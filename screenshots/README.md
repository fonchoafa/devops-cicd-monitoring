# Screenshot checklist

Save each screenshot here with these names. Never show `.env` or your admin key.

| File | What to capture |
| --- | --- |
| `01-actions-green.png` | The Actions run on `main` with Test, Build, Publish and Deploy all green |
| `02-deploy-summary.png` | The run's Summary tab with the "Deployed to staging" text |
| `03-ghcr-package.png` | The published image under Packages (tags `latest` and the commit id) |
| `04-pr-failing.png` | The pull request with the failing Test check (red cross) |
| `05-pr-passing.png` | The same pull request after the fix, all checks green |
| `06-local-tests.png` | `npm test` showing 14 passing tests |
| `07-compose-ps.png` | `docker compose ps` with the app `healthy` and Prometheus running |
| `08-metrics.png` | `curl.exe http://localhost:3000/metrics` output |
| `09-prometheus-targets.png` | http://localhost:9090/targets with `cloud-notes` UP |
| `10-prometheus-graph.png` | A query graph, for example `sum by (route) (rate(http_requests_total[1m]))` |
| `11-alert-firing.png` | http://localhost:9090/alerts with `AppDown` firing after `docker compose stop app` |
| `12-monitor-script.png` | The output of `.\scripts\monitor.ps1` |
