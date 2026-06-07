import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCommitOnBranch } from '../../../../../src/infrastructure/github/git-data';

vi.mock('@actions/github', () => ({
  context: {
    repo: { owner: 'jfrz38', repo: 'demo' },
  },
}));

describe('createCommitOnBranch', () => {
  let octokit: MockOctokit;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'version-bump-action-git-data-'));
    fs.writeFileSync(path.join(tempDir, 'build.gradle.kts'), 'version = "1.2.4"\n');
    fs.mkdirSync(path.join(tempDir, 'dist'));
    fs.writeFileSync(path.join(tempDir, 'dist', 'index.js'), 'generated bundle\n');
    octokit = createMockOctokit();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates blobs, a tree based on the base branch tree, a commit, and a new branch ref', async () => {
    await createCommitOnBranch(octokit, {
      baseBranch: 'develop',
      branch: 'chore/bump-version-1.2.4',
      changedFiles: ['build.gradle.kts'],
      commitMessage: 'Bump version to 1.2.4',
      cwd: tempDir,
    });

    expect(octokit.rest.git.getRef).toHaveBeenCalledWith({ owner: 'jfrz38', repo: 'demo', ref: 'heads/develop' });
    expect(octokit.rest.git.getCommit).toHaveBeenCalledWith({ owner: 'jfrz38', repo: 'demo', commit_sha: 'base-commit-sha' });
    expect(octokit.rest.git.createBlob).toHaveBeenCalledWith({
      owner: 'jfrz38',
      repo: 'demo',
      content: Buffer.from('version = "1.2.4"\n').toString('base64'),
      encoding: 'base64',
    });
    expect(octokit.rest.git.createTree).toHaveBeenCalledWith({
      owner: 'jfrz38',
      repo: 'demo',
      base_tree: 'base-tree-sha',
      tree: [{ path: 'build.gradle.kts', mode: '100644', type: 'blob', sha: 'blob-sha-1' }],
    });
    expect(octokit.rest.git.createCommit).toHaveBeenCalledWith({
      owner: 'jfrz38',
      repo: 'demo',
      message: 'Bump version to 1.2.4',
      tree: 'tree-sha',
      parents: ['base-commit-sha'],
    });
    expect(octokit.rest.git.createRef).toHaveBeenCalledWith({
      owner: 'jfrz38',
      repo: 'demo',
      ref: 'refs/heads/chore/bump-version-1.2.4',
      sha: 'commit-sha',
    });
    expect(octokit.rest.git.updateRef).not.toHaveBeenCalled();
  });

  it('updates an existing branch ref when a remote branch sha is present', async () => {
    await createCommitOnBranch(octokit, {
      baseBranch: 'develop',
      branch: 'chore/bump-version-1.2.4',
      changedFiles: ['build.gradle.kts'],
      commitMessage: 'Bump version to 1.2.4',
      cwd: tempDir,
      remoteBranchSha: 'remote-branch-sha',
    });

    expect(octokit.rest.git.updateRef).toHaveBeenCalledWith({
      owner: 'jfrz38',
      repo: 'demo',
      ref: 'heads/chore/bump-version-1.2.4',
      sha: 'commit-sha',
      force: true,
    });
    expect(octokit.rest.git.createRef).not.toHaveBeenCalled();
  });

  it('creates entries for generated files and deleted files', async () => {
    await createCommitOnBranch(octokit, {
      baseBranch: 'develop',
      branch: 'chore/bump-version-1.2.4',
      changedFiles: ['build.gradle.kts', 'dist/index.js', 'deleted.txt'],
      commitMessage: 'Bump version to 1.2.4',
      cwd: tempDir,
    });

    expect(octokit.rest.git.createTree).toHaveBeenCalledWith(
      expect.objectContaining({
        tree: [
          { path: 'build.gradle.kts', mode: '100644', type: 'blob', sha: 'blob-sha-1' },
          { path: 'dist/index.js', mode: '100644', type: 'blob', sha: 'blob-sha-2' },
          { path: 'deleted.txt', mode: '100644', type: 'blob', sha: null },
        ],
      }),
    );
  });
});

type MockOctokit = Parameters<typeof createCommitOnBranch>[0] & {
  rest: {
    git: {
      createBlob: ReturnType<typeof vi.fn>;
      createCommit: ReturnType<typeof vi.fn>;
      createRef: ReturnType<typeof vi.fn>;
      createTree: ReturnType<typeof vi.fn>;
      getCommit: ReturnType<typeof vi.fn>;
      getRef: ReturnType<typeof vi.fn>;
      updateRef: ReturnType<typeof vi.fn>;
    };
  };
};

function createMockOctokit(): MockOctokit {
  let blobCount = 0;

  return {
    rest: {
      git: {
        createBlob: vi.fn().mockImplementation(() => {
          blobCount += 1;
          return Promise.resolve({ data: { sha: `blob-sha-${blobCount}` } });
        }),
        createCommit: vi.fn().mockResolvedValue({ data: { sha: 'commit-sha' } }),
        createRef: vi.fn().mockResolvedValue({ data: { ref: 'refs/heads/chore/bump-version-1.2.4' } }),
        createTree: vi.fn().mockResolvedValue({ data: { sha: 'tree-sha' } }),
        getCommit: vi.fn().mockResolvedValue({ data: { tree: { sha: 'base-tree-sha' } } }),
        getRef: vi.fn().mockResolvedValue({ data: { object: { sha: 'base-commit-sha' } } }),
        updateRef: vi.fn().mockResolvedValue({ data: { ref: 'refs/heads/chore/bump-version-1.2.4' } }),
      },
    },
  } as unknown as MockOctokit;
}
