# Auto Version Bump Action

[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/jfrz38/auto-version-bump-action/ci.yml)](https://github.com/jfrz38/auto-version-bump-action/actions/workflows/ci.yml)
[![GitHub release](https://img.shields.io/github/v/release/jfrz38/auto-version-bump-action?display_name=tag)](https://github.com/jfrz38/auto-version-bump-action/releases)
[![GitHub Marketplace](https://img.shields.io/badge/marketplace-check--version--change-blue?logo=githubactions)](https://github.com/marketplace/actions/auto-version-bump-action)
[![License](https://img.shields.io/github/license/jfrz38/auto-version-bump-action)](LICENSE)

Reusable GitHub Action that bumps a simple SemVer version, creates a GitHub API commit on a bump branch, and opens a draft pull request.

It is designed for release-preparation workflows where a maintainer reviews and merges the version bump before a separate release workflow creates tags, GitHub Releases, or publishes artifacts.

## Quick start

Use this action after `actions/checkout` and give the workflow permission to write repository contents and open a pull request.

```yaml
name: Bump Version

on:
  workflow_dispatch:
    inputs:
      bump:
        type: choice
        required: true
        options: [patch, minor, major]

permissions:
  contents: write
  pull-requests: write

jobs:
  bump:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: jfrz38/auto-version-bump-action@v0
        with:
          bump: ${{ inputs.bump }}
          strategy: npm
          version-file: package.json
```

This creates or reuses a branch such as `chore/bump-version-1.2.4`, commits the version change through the GitHub API, and opens a draft pull request.

## What it does

- Reads the current version from a supported project file.
- Validates simple SemVer: `MAJOR.MINOR.PATCH`.
- Calculates a `patch`, `minor`, or `major` bump.
- Updates the version file.
- Fails if the target tag or GitHub Release already exists, unless disabled.
- Creates `chore/bump-version-{next-version}` by default using the GitHub API.
- Opens a GitHub pull request, draft by default.
- Reuses an existing open PR for the same branch/base instead of creating a duplicate.

## What it does not do

- It does not create a git tag.
- It does not create a GitHub Release.
- It does not publish packages or artifacts.
- It does not merge the pull request.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `bump` | Yes | | Version component to bump: `patch`, `minor`, or `major`. |
| `strategy` | Yes | | Version file strategy: `gradle-kts`, `npm`, or `regex`. |
| `version-file` | Yes | | Path to the file that contains the version. |
| `version-pattern` | For `regex` | | Regex with exactly one capture group containing the current version. |
| `version-replacement` | For `regex` | | Replacement template. Use `{version}` for the next version. |
| `base-branch` | No | current/default branch | Base branch for the pull request. |
| `branch-prefix` | No | `chore/bump-version-` | Prefix for the bump branch. |
| `tag-prefix` | No | `v` | Prefix used for tag/release existence checks. |
| `draft` | No | `true` | Whether to create the pull request as a draft. |
| `github-token` | No | `${{ github.token }}` | Token used for checks, GitHub API commits, branch updates, and PR creation. |
| `overwrite-existing-branch` | No | `false` | Overwrite an existing bump branch when no open pull request is found for it. |
| `commit-message` | No | `Bump version to {version}` | Commit message template. |
| `pre-commit-commands` | No | | Commands to run after the version bump and before committing changes. One command per line. |
| `pr-title` | No | `Bump version to {version}` | Pull request title template. |
| `pr-body` | No | `Bumps version from {current-version} to {next-version} using a {bump} release bump.` | Pull request body template. |
| `fail-if-tag-exists` | No | `true` | Fail if `${tag-prefix}${next-version}` already exists as a tag. |
| `fail-if-release-exists` | No | `true` | Fail if a GitHub Release already exists for the tag. |

Template inputs support:

- `{version}` and `{next-version}`
- `{current-version}`
- `{bump}`

If a bump branch already exists but there is no open pull request for it, the action fails by default so it does not overwrite remote work accidentally. Set `overwrite-existing-branch: true` to replace that generated bump branch by updating the remote ref through the GitHub API.

`pre-commit-commands` runs in the checked-out workspace after the version file is updated and before the action creates the bump commit. If any command exits with a non-zero status, the action fails before creating the branch commit or opening the pull request. Any files changed, created, or deleted by those commands are included in the same bump commit.

## Pre-Commit Command Environment

`pre-commit-commands` uses the binaries available in the current GitHub Actions job environment. This action does not install project-specific tools automatically.

Prepare any required runtime, package manager, or build tool before this action runs. For example, `pnpm`, `poetry`, `make`, Java, Gradle, Rust, or Go may need setup steps depending on the runner image and the versions your project requires.

For Node projects that use `pnpm`, prepare Node and enable Corepack before running the action:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0

- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: pnpm

- run: corepack enable

- run: pnpm install --frozen-lockfile

- uses: jfrz38/auto-version-bump-action@v0
  with:
    bump: minor
    strategy: npm
    version-file: packages/cli/package.json
    pre-commit-commands: make package-github-action
```

You can also include simple setup directly in `pre-commit-commands`. Use one command per line:

```yaml
- uses: jfrz38/auto-version-bump-action@v0
  with:
    bump: minor
    strategy: npm
    version-file: packages/cli/package.json
    pre-commit-commands: |
      corepack enable
      pnpm install --frozen-lockfile
      make package-github-action
```

For Python projects that use Poetry, install Poetry before this action or include the setup inline:

```yaml
- uses: actions/setup-python@v5
  with:
    python-version: "3.13"
- name: Install Poetry
  run: pip install poetry

- uses: jfrz38/auto-version-bump-action@v0
  with:
    bump: patch
    strategy: regex
    version-file: pyproject.toml
    version-pattern: 'version = "(\d+\.\d+\.\d+)"'
    version-replacement: 'version = "{version}"'
    pre-commit-commands: poetry build
```

## Outputs

| Output | Description |
| --- | --- |
| `current-version` | Version read before applying the bump. |
| `next-version` | Version written by the action. |
| `tag` | Tag name associated with the next version. |
| `branch` | Branch pushed by the action. |
| `pr-url` | Created or reused pull request URL. |
| `changed-files` | Newline-separated list of files changed by the bump. |

## Permissions

The workflow using this action needs:

```yaml
permissions:
  contents: write
  pull-requests: write
```

Repository setting required: in **Settings > Actions > General**, enable **Allow GitHub Actions to create and approve pull requests**. Without this setting, the action can create the bump branch commit but cannot open the pull request.

Use `actions/checkout` with the target base branch and `fetch-depth: 0`.

The bump commit is created through the GitHub Git Data API using `github-token`. With the default `GITHUB_TOKEN`, GitHub creates the commit as `github-actions[bot]`, so it can appear as a verified GitHub Actions bot commit without configuring GPG or SSH signing keys in the consuming workflow.

## npm

For `package.json`, the action reads and updates the `version` field.

Without a `package-lock.json`, it writes the next version directly to `package.json`.

If a same-directory `package-lock.json` exists, the action runs:

```bash
npm version <next-version> --no-git-tag-version --allow-same-version
```

Example:

```yaml
- uses: actions/checkout@v4
  with:
    ref: ${{ inputs.base_branch }}
    fetch-depth: 0

- id: bump
  uses: jfrz38/auto-version-bump-action@v0
  with:
    bump: ${{ inputs.bump }}
    base-branch: ${{ inputs.base_branch }}
    strategy: npm
    version-file: package.json
```

## Gradle Kotlin DSL

For `gradle-kts`, the action updates exactly one Kotlin DSL version assignment in the configured file:

```kotlin
version = "0.1.2"
```

It fails if no matching assignment exists or if the file contains multiple matching version assignments.

Workflow:

```yaml
name: Bump Version

on:
  workflow_dispatch:
    inputs:
      bump:
        type: choice
        required: true
        options: [patch, minor, major]
      base_branch:
        type: choice
        required: true
        default: develop
        options: [develop, main]

permissions:
  contents: write
  pull-requests: write

jobs:
  bump:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.base_branch }}
          fetch-depth: 0

      - id: bump
        uses: jfrz38/auto-version-bump-action@v0
        with:
          bump: ${{ inputs.bump }}
          base-branch: ${{ inputs.base_branch }}
          strategy: gradle-kts
          version-file: mockguard/build.gradle.kts
```

## Regex

Use `regex` for files that are not covered by a built-in strategy.

`version-pattern` must match the text to replace and include exactly one capture group containing the current version. `version-replacement` replaces the whole match; put `{version}` where the next version should be written.

Example file:

```txt
releaseVersion=1.2.3
```

Example workflow step:

```yaml
- id: bump
  uses: jfrz38/auto-version-bump-action@v0
  with:
    bump: minor
    strategy: regex
    version-file: VERSION.txt
    version-pattern: 'releaseVersion=(\d+\.\d+\.\d+)'
    version-replacement: 'releaseVersion={version}'
```

For example, to update a Rust `Cargo.toml` package version:

```toml
[package]
name = "demo"
version = "1.2.3"
```

```yaml
- id: bump
  uses: jfrz38/auto-version-bump-action@v0
  with:
    bump: patch
    strategy: regex
    version-file: Cargo.toml
    version-pattern: '^version\s*=\s*"(\d+\.\d+\.\d+)"'
    version-replacement: 'version = "{version}"'
    pre-commit-commands: cargo check
```

If the repository commits `Cargo.lock`, run a Cargo command such as `cargo check` so Cargo can keep the lockfile consistent with the updated package version.

## Release flow

This action intentionally stops at the pull request. A separate workflow can create the tag and GitHub Release after the bump PR is merged into the release branch.

That keeps the release boundary explicit:

1. Run this action manually.
2. Review and merge the bump PR.
3. Let a release workflow create `v{version}` from the merged branch.
