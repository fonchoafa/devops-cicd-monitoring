# DevOps, CI/CD & Monitoring (Module 5)

[![CI/CD](https://github.com/fonchoafa/devops-cicd-monitoring/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/fonchoafa/devops-cicd-monitoring/actions/workflows/ci-cd.yml)

Codomax Digital Solutions internship, Module 5 (Day 21 to Day 25).
Author: Foncho Afanwi Ngwa ([@fonchoafa](https://github.com/fonchoafa))

This repository takes the **Cloud Notes** app from Modules 3 and 4 and adds an automated delivery pipeline with GitHub Actions and basic monitoring with Prometheus.

**Flow:** GitHub → Build → Test → Docker → Deploy → Monitor

## Pipeline

```
 git push / pull request
        |
   [ Test ]  ->  [ Build ]  ->  [ Publish ]  ->  [ Deploy ]   ->   [ Monitor ]
   14 tests      Docker image   ghcr.io image    run + verify        logs, /health,
                 + health check (main only)      the image           /metrics, Prometheus
```

| Stage | What happens | File |
| --- | --- | --- |
| Test | Install with `npm ci`, run 14 automated tests | [ci-cd.yml](.github/workflows/ci-cd.yml) |
| Docker build | Build the image, start it, wait for `healthy`, smoke test the API | [ci-cd.yml](.github/workflows/ci-cd.yml), [app/Dockerfile](app/Dockerfile) |
| Publish | Push the image to GitHub Container Registry as `latest` and the commit id | [ci-cd.yml](.github/workflows/ci-cd.yml) |
| Deploy | Pull the published image, run it, verify `/health` and `/metrics` | [ci-cd.yml](.github/workflows/ci-cd.yml) |
| Monitor | JSON logs, `/metrics`, Prometheus scraping and alert rules | [monitoring/](monitoring/) |

Pull requests run Test and Build. Only merges to `main` publish and deploy.

## What is in this repo

| Path | Content |
| --- | --- |
| [.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml) | The pipeline |
| [.github/dependabot.yml](.github/dependabot.yml) | Weekly dependency update pull requests |
| [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) | Pull request checklist |
| [app/](app/) | Express app, Dockerfile, 14 tests, `/health` and `/metrics` |
| [docker-compose.yml](docker-compose.yml) | App and Prometheus for local monitoring |
| [monitoring/](monitoring/) | Prometheus scrape config and alert rules |
| [scripts/monitor.ps1](scripts/monitor.ps1) | Terminal watch of health, latency, requests, errors and memory |
| [docs/01-devops-culture-and-git-workflow.md](docs/01-devops-culture-and-git-workflow.md) | DevOps culture, Git/GitHub workflow, branching, pull requests |
| [docs/02-ci-cd-pipeline.md](docs/02-ci-cd-pipeline.md) | How the pipeline works, job by job |
| [docs/03-monitoring-and-observability.md](docs/03-monitoring-and-observability.md) | Logs, metrics, health, Prometheus queries and alerts |
| [docs/04-run-guide.md](docs/04-run-guide.md) | Step-by-step on Windows, including the pull request exercise |
| [screenshots/](screenshots/) | Evidence (see checklist) |

## Quick start

```powershell
cd app
npm ci
npm test                         # 14 tests
cd ..
copy .env.example .env           # set ADMIN_KEY
docker compose up -d --build     # app on :3000, Prometheus on :9090
.\scripts\monitor.ps1
```

Full steps: [docs/04-run-guide.md](docs/04-run-guide.md).

## What I added to the app

- `GET /metrics`: request counts by route and status, a latency histogram, uptime and memory, in the Prometheus text format. Labels use route patterns so the number of series stays small. 3 new tests.

## Objectives covered

- [x] DevOps culture, Git/GitHub workflows (branches, pull requests, protected `main`) and CI/CD practices
- [x] Automated testing, build automation, deployment automation and environment management (staging environment, no secrets in the repo)
- [x] The full pipeline GitHub → Build → Test → Docker → Deploy → Monitor with basic logs and observability

## Security notes

- No secrets in Git. `.env` is git-ignored; the pipeline uses only the short-lived `GITHUB_TOKEN`.
- The workflow's default permissions are read-only; only `publish` can write packages.
- The pipeline uses throwaway keys for its test containers, never real ones.
- `/metrics` is open in this demo. In production it should be on a private network or protected.

## Lessons learned

> Add 3 or 4 sentences in your own words after you run it: what failed in the pipeline at first, how you found the cause, and what you would do differently.

## Clean up

```powershell
docker compose down -v
```
