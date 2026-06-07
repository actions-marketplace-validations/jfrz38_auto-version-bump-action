import type {
  CreateCommitOnBranchOptions,
  CreatePullRequestOptions,
  GitHubRepository,
  PullRequestResult,
} from '../../domain/ports/github-repository';
import { createGitHubClient, type Octokit } from './client';
import { createCommitOnBranch } from './git-data';
import { createPullRequest, findOpenPullRequest } from './pull-requests';
import { getBranchRefSha } from './refs';
import { assertReleaseDoesNotExist, assertTagDoesNotExist } from './release-checks';

export class GitHubGateway implements GitHubRepository {
  private constructor(private readonly octokit: Octokit) { }

  static create(githubToken: string): GitHubGateway {
    return new GitHubGateway(createGitHubClient(githubToken));
  }

  async assertTagDoesNotExist(tag: string): Promise<void> {
    await assertTagDoesNotExist(this.octokit, tag);
  }

  async assertReleaseDoesNotExist(tag: string): Promise<void> {
    await assertReleaseDoesNotExist(this.octokit, tag);
  }

  async findOpenPullRequest(baseBranch: string, branch: string): Promise<PullRequestResult | undefined> {
    return findOpenPullRequest(this.octokit, baseBranch, branch);
  }

  async getBranchRefSha(branch: string): Promise<string | undefined> {
    return getBranchRefSha(this.octokit, branch);
  }

  async createCommitOnBranch(options: CreateCommitOnBranchOptions): Promise<void> {
    await createCommitOnBranch(this.octokit, options);
  }

  async createPullRequest(options: CreatePullRequestOptions): Promise<PullRequestResult> {
    return createPullRequest(this.octokit, options);
  }
}
