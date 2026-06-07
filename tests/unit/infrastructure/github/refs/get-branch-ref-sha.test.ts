import { describe, expect, it, vi } from 'vitest';
import { getBranchRefSha } from '../../../../../src/infrastructure/github/refs';

vi.mock('@actions/github', () => ({
  context: {
    repo: { owner: 'jfrz38', repo: 'demo' },
  },
}));

describe('getBranchRefSha', () => {
  it('returns the branch ref sha', async () => {
    const octokit = createMockOctokit();
    octokit.rest.git.getRef.mockResolvedValue({ data: { object: { sha: 'branch-sha' } } });

    await expect(getBranchRefSha(octokit, 'chore/bump-version-1.2.4')).resolves.toBe('branch-sha');

    expect(octokit.rest.git.getRef).toHaveBeenCalledWith({ owner: 'jfrz38', repo: 'demo', ref: 'heads/chore/bump-version-1.2.4' });
  });

  it('returns undefined when the branch ref does not exist', async () => {
    const octokit = createMockOctokit();
    octokit.rest.git.getRef.mockRejectedValue({ status: 404 });

    await expect(getBranchRefSha(octokit, 'missing')).resolves.toBeUndefined();
  });

  it('rethrows non-not-found errors', async () => {
    const octokit = createMockOctokit();
    octokit.rest.git.getRef.mockRejectedValue(new Error('GitHub API unavailable'));

    await expect(getBranchRefSha(octokit, 'chore/bump-version-1.2.4')).rejects.toThrow('GitHub API unavailable');
  });
});

function createMockOctokit() {
  return {
    rest: {
      git: {
        getRef: vi.fn(),
      },
    },
  } as any;
}
