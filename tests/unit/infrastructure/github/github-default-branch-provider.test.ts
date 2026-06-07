import { afterEach, describe, expect, it, vi } from 'vitest';
import { GitHubDefaultBranchProvider } from '../../../../src/infrastructure/github';

const githubMock = vi.hoisted(() => ({
  context: {
    payload: {
      repository: undefined as { default_branch?: unknown } | undefined,
    },
  },
}));

vi.mock('@actions/github', () => githubMock);

describe('GitHubDefaultBranchProvider', () => {
  afterEach(() => {
    delete process.env.GITHUB_REF_NAME;
    githubMock.context.payload.repository = undefined;
  });

  it('uses the repository default branch from the GitHub payload', () => {
    githubMock.context.payload.repository = { default_branch: 'main' };
    process.env.GITHUB_REF_NAME = 'develop';

    expect(new GitHubDefaultBranchProvider().getDefaultBranch()).toBe('main');
  });

  it('falls back to GITHUB_REF_NAME when the payload default branch is unavailable', () => {
    process.env.GITHUB_REF_NAME = 'develop';

    expect(new GitHubDefaultBranchProvider().getDefaultBranch()).toBe('develop');
  });

  it('returns an empty string when no default branch can be resolved', () => {
    expect(new GitHubDefaultBranchProvider().getDefaultBranch()).toBe('');
  });
});
