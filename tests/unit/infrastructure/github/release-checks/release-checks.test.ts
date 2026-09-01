import { describe, expect, it, vi } from 'vitest';
import { assertReleaseDoesNotExist, assertTagDoesNotExist } from '../../../../../src/infrastructure/github/release-checks';

vi.mock('@actions/github', () => ({
  context: {
    repo: { owner: 'jfrz38', repo: 'demo' },
  },
}));

describe('release checks', () => {
  it('passes when the tag ref does not exist', async () => {
    const octokit = createMockOctokit();
    octokit.rest.git.getRef.mockRejectedValue({ status: 404 });

    await expect(assertTagDoesNotExist(octokit, 'v1.2.4')).resolves.toBeUndefined();

    expect(octokit.rest.git.getRef).toHaveBeenCalledWith({ owner: 'jfrz38', repo: 'demo', ref: 'tags/v1.2.4' });
  });

  it('fails when the tag ref already exists', async () => {
    const octokit = createMockOctokit();
    octokit.rest.git.getRef.mockResolvedValue({ data: { ref: 'refs/tags/v1.2.4' } });

    await expect(assertTagDoesNotExist(octokit, 'v1.2.4')).rejects.toThrow('Tag v1.2.4 already exists.');
  });

  it('passes when the release does not exist', async () => {
    const octokit = createMockOctokit();
    octokit.rest.repos.getReleaseByTag.mockRejectedValue({ status: 404 });

    await expect(assertReleaseDoesNotExist(octokit, 'v1.2.4')).resolves.toBeUndefined();

    expect(octokit.rest.repos.getReleaseByTag).toHaveBeenCalledWith({ owner: 'jfrz38', repo: 'demo', tag: 'v1.2.4' });
  });

  it('fails when the release already exists', async () => {
    const octokit = createMockOctokit();
    octokit.rest.repos.getReleaseByTag.mockResolvedValue({ data: { tag_name: 'v1.2.4' } });

    await expect(assertReleaseDoesNotExist(octokit, 'v1.2.4')).rejects.toThrow('GitHub Release v1.2.4 already exists.');
  });

  it('rethrows unexpected API errors', async () => {
    const octokit = createMockOctokit();
    octokit.rest.git.getRef.mockRejectedValue(new Error('GitHub API unavailable'));

    await expect(assertTagDoesNotExist(octokit, 'v1.2.4')).rejects.toThrow('GitHub API unavailable');
  });
});

type MockOctokit = Parameters<typeof assertTagDoesNotExist>[0] & {
  rest: {
    git: {
      getRef: ReturnType<typeof vi.fn>;
    };
    repos: {
      getReleaseByTag: ReturnType<typeof vi.fn>;
    };
  };
};

function createMockOctokit(): MockOctokit {
  return {
    rest: {
      git: {
        getRef: vi.fn(),
      },
      repos: {
        getReleaseByTag: vi.fn(),
      },
    },
  } as unknown as MockOctokit;
}
