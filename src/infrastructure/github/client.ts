import * as github from '@actions/github';

export type Octokit = ReturnType<typeof github.getOctokit>;

export function createGitHubClient(githubToken: string): Octokit {
  if (!githubToken) {
    throw new Error('Input "github-token" is required for tag/release checks and pull request creation.');
  }

  return github.getOctokit(githubToken);
}
