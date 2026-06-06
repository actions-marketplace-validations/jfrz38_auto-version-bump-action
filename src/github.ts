import fs from 'node:fs/promises';
import path from 'node:path';
import * as github from '@actions/github';

export interface PullRequestResult {
  url: string;
}

export interface GitHubClientOptions {
  baseBranch: string;
  branch: string;
  draft: boolean;
  githubToken: string;
  prBody: string;
  prTitle: string;
  tag: string;
}

export interface CreateCommitOnBranchOptions {
  baseBranch: string;
  branch: string;
  changedFiles: string[];
  commitMessage: string;
  cwd: string;
  remoteBranchSha?: string;
}

type Octokit = ReturnType<typeof github.getOctokit>;

type TreeEntry = {
  mode: '100644';
  path: string;
  sha: string | null;
  type: 'blob';
};

function ensureRepositoryContext(): { owner: string; repo: string } {
  const { owner, repo } = github.context.repo;
  if (!owner || !repo) {
    throw new Error('GitHub repository context is unavailable. This action must run inside a GitHub repository workflow.');
  }

  return { owner, repo };
}

export function getDefaultBranch(): string {
  const repository = github.context.payload.repository;
  const defaultBranch = typeof repository?.default_branch === 'string' ? repository.default_branch : '';
  if (defaultBranch) {
    return defaultBranch;
  }

  return process.env.GITHUB_REF_NAME ?? '';
}

export function createGitHubClient(githubToken: string): Octokit {
  if (!githubToken) {
    throw new Error('Input "github-token" is required for tag/release checks and pull request creation.');
  }

  return github.getOctokit(githubToken);
}

export async function getBranchRefSha(octokit: Octokit, branch: string): Promise<string | undefined> {
  const { owner, repo } = ensureRepositoryContext();

  try {
    const response = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
    return response.data.object.sha;
  } catch (error) {
    if (isNotFound(error)) {
      return undefined;
    }
    throw error;
  }
}

export async function createCommitOnBranch(octokit: Octokit, options: CreateCommitOnBranchOptions): Promise<void> {
  const { owner, repo } = ensureRepositoryContext();
  const baseRef = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${options.baseBranch}` });
  const baseCommitSha = baseRef.data.object.sha;
  const baseCommit = await octokit.rest.git.getCommit({ owner, repo, commit_sha: baseCommitSha });
  const tree: TreeEntry[] = [];

  for (const filePath of options.changedFiles) {
    const fullPath = path.resolve(options.cwd, filePath);
    try {
      const content = await fs.readFile(fullPath, 'base64');
      const blob = await octokit.rest.git.createBlob({ owner, repo, content, encoding: 'base64' });
      tree.push({ path: filePath, mode: '100644', type: 'blob', sha: blob.data.sha });
    } catch (error) {
      if (!isFileNotFound(error)) {
        throw error;
      }
      tree.push({ path: filePath, mode: '100644', type: 'blob', sha: null });
    }
  }

  const newTree = await octokit.rest.git.createTree({ owner, repo, base_tree: baseCommit.data.tree.sha, tree });
  const commit = await octokit.rest.git.createCommit({
    owner,
    repo,
    message: options.commitMessage,
    tree: newTree.data.sha,
    parents: [baseCommitSha],
  });

  if (options.remoteBranchSha) {
    await octokit.rest.git.updateRef({ owner, repo, ref: `heads/${options.branch}`, sha: commit.data.sha, force: true });
    return;
  }

  await octokit.rest.git.createRef({ owner, repo, ref: `refs/heads/${options.branch}`, sha: commit.data.sha });
}

export async function assertTagDoesNotExist(octokit: Octokit, tag: string): Promise<void> {
  const { owner, repo } = ensureRepositoryContext();

  try {
    await octokit.rest.git.getRef({ owner, repo, ref: `tags/${tag}` });
  } catch (error) {
    if (isNotFound(error)) {
      return;
    }
    throw error;
  }

  throw new Error(`Tag ${tag} already exists.`);
}

export async function assertReleaseDoesNotExist(octokit: Octokit, tag: string): Promise<void> {
  const { owner, repo } = ensureRepositoryContext();

  try {
    await octokit.rest.repos.getReleaseByTag({ owner, repo, tag });
  } catch (error) {
    if (isNotFound(error)) {
      return;
    }
    throw error;
  }

  throw new Error(`GitHub Release ${tag} already exists.`);
}

export async function findOpenPullRequest(octokit: Octokit, baseBranch: string, branch: string): Promise<PullRequestResult | undefined> {
  const { owner, repo } = ensureRepositoryContext();
  const response = await octokit.rest.pulls.list({
    owner,
    repo,
    base: baseBranch,
    head: `${owner}:${branch}`,
    state: 'open',
    per_page: 1,
  });

  const [pullRequest] = response.data;
  if (!pullRequest) {
    return undefined;
  }

  return { url: pullRequest.html_url };
}

export async function createPullRequest(octokit: Octokit, options: GitHubClientOptions): Promise<PullRequestResult> {
  const { owner, repo } = ensureRepositoryContext();
  const response = await octokit.rest.pulls.create({
    owner,
    repo,
    base: options.baseBranch,
    head: options.branch,
    title: options.prTitle,
    body: options.prBody,
    draft: options.draft,
  });

  return { url: response.data.html_url };
}

function isNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 404;
}

function isFileNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
