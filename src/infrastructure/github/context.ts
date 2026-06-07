import * as github from '@actions/github';

export interface RepositoryContext {
  owner: string;
  repo: string;
}

export function ensureRepositoryContext(): RepositoryContext {
  const { owner, repo } = github.context.repo;
  if (!owner || !repo) {
    throw new Error('GitHub repository context is unavailable. This action must run inside a GitHub repository workflow.');
  }

  return { owner, repo };
}
