# 2. The CI/CD pipeline (GitHub Actions)

The whole pipeline is one file: [.github/workflows/ci-cd.yml](../.github/workflows/ci-cd.yml).

**Flow:** GitHub → Build → Test → Docker → Deploy → Monitor

```
 git push / pull request
        |
        v
   +--------+    +-------------------------+    +----------------------+    +---------------------+
   |  test  | -> |  build                  | -> |  publish             | -> |  deploy             |
   | npm ci |    | docker build            |    | login to ghcr.io     |    | pull published image|
   | npm    |    | run container           |    | push :latest :<sha>  |    | run it, check health|
   | test   |    | wait healthy + smoke    |    | (main branch only)   |    | and /metrics        |
   +--------+    +-------------------------+    +----------------------+    +---------------------+
   pull requests run these two  ---------------^   pushes to main run all four
```

## Words you need

| Term | Meaning |
| --- | --- |
| **CI** (continuous integration) | Every change is built and tested automatically, so problems show up in minutes |
| **CD** (continuous delivery) | Every passing change is turned into a release that is ready to deploy |
| **Continuous deployment** | The same, but the deploy step also happens automatically |
| **Workflow** | The YAML file that describes the automation |
| **Job** | A group of steps that runs on one fresh machine (a "runner") |
| **Step** | One command or one reusable action |
| **Action** | A packaged step, for example `actions/checkout@v4` |
| **Artifact / image** | The thing the pipeline produces, here a Docker image |

## The jobs

| Job | What it does | Fails when |
| --- | --- | --- |
| `test` | Installs dependencies with `npm ci` and runs all 14 automated tests | a test fails |
| `build` | Builds the Docker image, starts it, waits for Docker's health check to report `healthy`, creates a note, reads `/metrics`, and checks that an unauthorized delete returns 401 | the image does not build, the app is unhealthy, or a smoke check fails |
| `publish` | Logs in to `ghcr.io` with the built-in token and pushes the image tagged `latest` and with the short commit id | login or push fails |
| `deploy` | Pulls the image that was just published, runs it, checks `/health` and `/metrics`, and writes a summary on the run page | the published image does not start healthy |

`needs:` makes the jobs run in order. If `test` fails, nothing after it runs.
`if: github.event_name == 'push' && github.ref == 'refs/heads/main'` restricts publishing to merges on `main`, so pull requests never publish anything.

## Why it is written this way

| Choice | Reason |
| --- | --- |
| `permissions: contents: read` at the top | **Least privilege**: the default token can only read. `publish` asks for `packages: write` and `deploy` for `packages: read`, only where needed |
| `secrets.GITHUB_TOKEN` | GitHub creates it for each run and it expires when the run ends, so no password is stored anywhere |
| `cache: npm` and `cache-from: type=gha` | Reuse downloads and Docker layers between runs, so builds are faster |
| `concurrency: cancel-in-progress` | A newer push cancels an older run on the same branch instead of wasting minutes |
| `environment: staging` | GitHub records each deployment under the repository's **Environments** and can require approvals there |
| Image name in lowercase | `ghcr.io` only accepts lowercase names, so the workflow lowercases it |
| Pinned action versions (`@v4`) | The pipeline does not change unexpectedly; Dependabot proposes updates as pull requests |

## Reading a run

1. Open the repository, click **Actions**, then a run.
2. A green check means passed, a red cross means failed, a yellow dot means running.
3. Click a job, then a step, to see its log. For a failure, read the **first red line** in the log.
4. After a deploy, open the run's **Summary** tab to see the deployment summary.
5. The repository's right sidebar shows **Packages** (the image) and **Deployments** (staging).

## Where "deploy" stops

The `deploy` job runs the published image on the GitHub runner and proves it works. That is a **staging verification**, not a permanent server. To deploy to a real machine (for example the Module 3 EC2 instance), add a job that connects over SSH using repository secrets (`DEPLOY_HOST`, `DEPLOY_SSH_KEY`) and runs `docker compose pull && docker compose up -d` there. This project does not include that job, so no server credentials are needed.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `test` fails | A test or the code is broken | Read the failing test name in the log, fix it, push again |
| `build` says "container did not become healthy" | App crashed at start | Read the `docker logs` output in the "Show container logs" step |
| `publish`: `denied: permission_denied` | The workflow may not write packages | Settings, Actions, General, Workflow permissions: allow **Read and write**; re-run |
| `publish`: repository name must be lowercase | Not applicable here (the workflow lowercases it) | If you add a new step, lowercase the name too |
| `deploy` cannot pull the image | Package is private and the job lacks `packages: read` | Keep the `permissions` block in the `deploy` job |
| Nothing runs on push | Workflow file is not under `.github/workflows/` or has a YAML error | Check the path and indentation; the Actions tab shows YAML errors |
| Run is skipped on a pull request | `publish` and `deploy` only run on `main` | Expected |
