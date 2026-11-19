# 4. Run guide (Windows)

You will: run the tests, run the app with monitoring, push to GitHub, watch the pipeline, practice the pull request flow, and collect evidence.

## Before you start

- Docker Desktop running (`docker version` shows Client and Server)
- Node.js 22 (`node -v`) and Git (`git --version`)
- A GitHub account (`fonchoafa`)

Open the project folder (the one that contains `docker-compose.yml`, `app`, `docs`). If unzipping created a folder inside a folder, step into the inner one first.

## Step 1: tests

```powershell
cd app
npm ci
npm test            # expect: tests 14, pass 14
cd ..
```

## Step 2: run the app and Prometheus locally

```powershell
copy .env.example .env      # then set ADMIN_KEY=<your own long random value>
docker compose up -d --build
docker compose ps           # app "healthy", prometheus "running"
```

- App: http://localhost:3000
- Prometheus: http://localhost:9090 (try the queries in [03](03-monitoring-and-observability.md))
- `.\scripts\monitor.ps1 -Count 5 -IntervalSeconds 2`

Take screenshots 06 to 10 now (see the checklist). When done: `docker compose down`.

## Step 3: push to GitHub and watch the pipeline

1. On GitHub create a **public** repository named `devops-cicd-monitoring`, empty (no README or license).
2. From the project folder:
   ```powershell
   git init
   git add .
   git status                 # .env must NOT be listed
   git commit -m "Module 5: CI/CD pipeline and monitoring"
   git branch -M main
   git remote add origin https://github.com/fonchoafa/devops-cicd-monitoring.git
   git push -u origin main
   ```
3. Open the repository, **Actions** tab. The **CI/CD** run starts by itself. Wait for all four jobs (Test, Build, Publish, Deploy) to turn green. Screenshot it (`01`).
4. Open the run, click **Deploy to staging and verify**, then the **Summary** tab (`02`).
5. On the repository home page, find **Packages** in the right sidebar and open the image (`03`). To let anyone pull it: package page, **Package settings**, **Change visibility**, Public.

If a job fails, open it and read the first red line, then see the troubleshooting table in [02](02-ci-cd-pipeline.md).

## Step 4: practice the Git/GitHub workflow

Break something on purpose to see the pipeline protect `main`:

```powershell
git switch -c experiment/failing-test
```

Open `app/test/metrics.test.js`, find `app_info\{version="1\.0\.0"\}` and change `1\.0\.0` to `9\.9\.9`. Then:

```powershell
git add .
git commit -m "test: break a test on purpose"
git push -u origin experiment/failing-test
```

1. On GitHub click **Compare & pull request**, create it. The checks run and the **Test** job fails with a red cross. Screenshot the pull request (`04`). Note that **Publish** and **Deploy** did not run: nothing broken reached `main`.
2. Fix it: `git revert HEAD --no-edit` then `git push`. The checks run again and go green. Screenshot (`05`).
3. **Merge** the pull request (squash and merge), delete the branch, then locally:
   ```powershell
   git switch main
   git pull
   git branch -d experiment/failing-test
   ```

Optional: protect `main` (see [01](01-devops-culture-and-git-workflow.md)).

## Step 5: evidence and README

Save screenshots into `screenshots/` with the names in [../screenshots/README.md](../screenshots/README.md). Never show `.env` or your admin key. Replace the Lessons learned placeholder in `README.md` with your own words, then:

```powershell
git add .
git commit -m "docs: add screenshots and lessons learned"
git push
```

(If `main` is protected, do this through a branch and pull request, which is the workflow you just practiced.)

## Step 6: LinkedIn and submit

Post on LinkedIn tagging **Codomax Digital Solutions** from the dropdown, copy the post link, then submit the repository link and the post link on the portal for Module 5.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `required variable ADMIN_KEY is missing` | `copy .env.example .env` and set the value |
| Port 3000 or 9090 already in use | Change the left number in `ports:` in `docker-compose.yml` |
| Prometheus target is DOWN | `docker compose ps`, then `docker compose logs app` |
| Actions tab is empty | The `.github` folder was not pushed. Check `git status` and that the folder is at the repo root |
| `git push` rejected | `git pull --rebase`, then push again |
| Anything pipeline related | [02-ci-cd-pipeline.md](02-ci-cd-pipeline.md), Troubleshooting |
