export interface CreateCommitOnBranchOptions {
  baseBranch: string;
  branch: string;
  changedFiles: string[];
  commitMessage: string;
  cwd: string;
  remoteBranchSha?: string;
}

export interface CreatePullRequestOptions {
  baseBranch: string;
  branch: string;
  draft: boolean;
  prBody: string;
  prTitle: string;
}

export interface PullRequestResult {
  url: string;
}

export interface GitHubRepository {
  assertTagDoesNotExist(tag: string): Promise<void>;
  assertReleaseDoesNotExist(tag: string): Promise<void>;
  findOpenPullRequest(baseBranch: string, branch: string): Promise<PullRequestResult | undefined>;
  getBranchRefSha(branch: string): Promise<string | undefined>;
  createCommitOnBranch(options: CreateCommitOnBranchOptions): Promise<void>;
  createPullRequest(options: CreatePullRequestOptions): Promise<PullRequestResult>;
}

export type GitHubRepositoryFactory = (githubToken: string) => GitHubRepository;
