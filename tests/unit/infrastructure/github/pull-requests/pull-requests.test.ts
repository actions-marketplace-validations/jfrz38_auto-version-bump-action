import { describe, expect, it, vi } from 'vitest';
import { createPullRequest, findOpenPullRequest } from '../../../../../src/infrastructure/github/pull-requests';

vi.mock('@actions/github', () => ({
  context: {
    repo: { owner: 'jfrz38', repo: 'demo' },
  },
}));

describe('pull request GitHub API helpers', () => {
  it('finds an open pull request for the base branch and owner-qualified head branch', async () => {
    const octokit = createMockOctokit();
    octokit.rest.pulls.list.mockResolvedValue({ data: [{ html_url: 'https://github.com/jfrz38/demo/pull/1' }] });

    await expect(findOpenPullRequest(octokit, 'develop', 'chore/bump-version-1.2.4')).resolves.toEqual({ url: 'https://github.com/jfrz38/demo/pull/1' });

    expect(octokit.rest.pulls.list).toHaveBeenCalledWith({
      owner: 'jfrz38',
      repo: 'demo',
      base: 'develop',
      head: 'jfrz38:chore/bump-version-1.2.4',
      state: 'open',
      per_page: 1,
    });
  });

  it('returns undefined when no open pull request exists', async () => {
    const octokit = createMockOctokit();
    octokit.rest.pulls.list.mockResolvedValue({ data: [] });

    await expect(findOpenPullRequest(octokit, 'develop', 'chore/bump-version-1.2.4')).resolves.toBeUndefined();
  });

  it('creates a pull request from options', async () => {
    const octokit = createMockOctokit();
    octokit.rest.pulls.create.mockResolvedValue({ data: { html_url: 'https://github.com/jfrz38/demo/pull/1' } });

    await expect(
      createPullRequest(octokit, {
        baseBranch: 'develop',
        branch: 'chore/bump-version-1.2.4',
        draft: true,
        prBody: 'Body',
        prTitle: 'Title',
      }),
    ).resolves.toEqual({ url: 'https://github.com/jfrz38/demo/pull/1' });

    expect(octokit.rest.pulls.create).toHaveBeenCalledWith({
      owner: 'jfrz38',
      repo: 'demo',
      base: 'develop',
      head: 'chore/bump-version-1.2.4',
      title: 'Title',
      body: 'Body',
      draft: true,
    });
  });
});

type MockOctokit = Parameters<typeof findOpenPullRequest>[0] & {
  rest: {
    pulls: {
      create: ReturnType<typeof vi.fn>;
      list: ReturnType<typeof vi.fn>;
    };
  };
};

function createMockOctokit(): MockOctokit {
  return {
    rest: {
      pulls: {
        create: vi.fn(),
        list: vi.fn(),
      },
    },
  } as unknown as MockOctokit;
}
