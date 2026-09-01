import type { PullRequestResult } from '../../../domain/ports/github-repository';
import type { Octokit } from '../client';
import { ensureRepositoryContext } from '../context';

const OPEN_STATE = 'open';
const SINGLE_PULL_REQUEST = 1;

export async function findOpenPullRequest(octokit: Octokit, baseBranch: string, branch: string): Promise<PullRequestResult | undefined> {
  const { owner, repo } = ensureRepositoryContext();
  const response = await octokit.rest.pulls.list({
    owner,
    repo,
    base: baseBranch,
    head: `${owner}:${branch}`,
    state: OPEN_STATE,
    per_page: SINGLE_PULL_REQUEST,
  });

  const [pullRequest] = response.data;
  if (!pullRequest) {
    return undefined;
  }

  return { url: pullRequest.html_url };
}
