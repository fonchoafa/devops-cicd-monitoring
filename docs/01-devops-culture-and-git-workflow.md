# 1. DevOps culture and the Git/GitHub workflow

## What DevOps is

DevOps is a way of working where the people who **develop** software and the people who **operate** it share responsibility for the whole life of the product, and automate the repetitive parts. The goal is to ship small changes often, safely and quickly, and to learn quickly when something breaks.

```
        Plan -> Code -> Build -> Test -> Release -> Deploy -> Operate -> Monitor
         ^                                                                  |
         +------------------------- feedback loop ---------------------------+
```

The loop never ends: what you learn from monitoring feeds the next plan. In this project each stage has a real piece:

| Stage | Where it happens in this repo |
| --- | --- |
| Plan and Code | Issues, branches and pull requests on GitHub |
| Build and Test | `test` and `build` jobs in [.github/workflows/ci-cd.yml](../.github/workflows/ci-cd.yml) |
| Release | The `publish` job pushes a versioned Docker image to GitHub Container Registry |
| Deploy | The `deploy` job runs the published image and verifies it |
| Operate and Monitor | JSON logs, `/health`, `/metrics` and Prometheus (see [03](03-monitoring-and-observability.md)) |

## Culture, in four ideas (CALMS)

| Idea | Meaning | Example here |
| --- | --- | --- |
| **C**ulture | Shared ownership, blameless learning from failures | A red build is information, not blame |
| **A**utomation | Machines do the repeatable work | Tests, image builds and publishing run on every push |
| **L**ean | Small batches, less waiting | Small pull requests merged often |
| **M**easurement | Decide with data | Metrics, health checks, build status |
| **S**haring | Knowledge is written down | The docs and PR template in this repo |

## Git and GitHub workflow used here

The project uses a simple **feature-branch workflow** with a protected `main` branch. `main` always holds code that passed the pipeline.

```
 main      o-----o-----------o-----------o
                  \         /
 feature           o---o---o     <- you work here, open a pull request, CI runs, then merge
```

### Step by step (PowerShell)

```powershell
git switch main
git pull                                  # start from the latest main
git switch -c feature/short-description   # 1. a branch for ONE change

# ...edit files...
git status                                # 2. what changed?
git add .
git commit -m "feat: add health note to README"   # 3. a small, clear commit
git push -u origin feature/short-description      # 4. publish the branch
```

5. On GitHub, click **Compare & pull request**, fill in the template, and create the pull request.
6. The pipeline runs on the pull request. Wait for the green check (or fix the red one by pushing another commit to the same branch).
7. **Merge** the pull request (squash and merge keeps `main` tidy), then delete the branch.
8. Locally: `git switch main`, then `git pull`.

### Commit messages

Start with a short type, then what changed, in the present tense:

| Prefix | Use for |
| --- | --- |
| `feat:` | a new feature |
| `fix:` | a bug fix |
| `docs:` | documentation only |
| `ci:` | pipeline changes |
| `test:` | tests only |
| `chore:` | maintenance, dependency updates |

### Protect `main` (one-time, on GitHub)

Settings, **Branches**, **Add branch protection rule** for `main`:

- Require a pull request before merging
- Require status checks to pass, and select **Test** and **Build and check the Docker image** (they appear in the list after the pipeline has run once)

With this, nobody (including you) can merge code that fails the tests.

### Useful Git commands

| Command | Use |
| --- | --- |
| `git log --oneline -10` | recent history |
| `git diff` | unstaged changes |
| `git restore <file>` | throw away changes to a file |
| `git revert <commit>` | undo a commit by adding a new one (safe on shared branches) |
| `git branch -d <name>` | delete a merged local branch |
| `git stash` / `git stash pop` | put work aside and bring it back |
