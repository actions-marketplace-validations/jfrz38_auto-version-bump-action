import type { CreatePullRequestOptions, PullRequestResult } from '../../../domain/ports/github-repository';
import type { Octokit } from '../client';
import { ensureRepositoryContext } from '../context';

export async function createPullRequest(octokit: Octokit, options: CreatePullRequestOptions): Promise<PullRequestResult> {
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
