import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VersionBumpPrUseCase } from '../../../src/application/version-bump-pr-use-case';
import { TemplateRenderer } from '../../../src/application/template-renderer';
import { ActionConfig } from '../../../src/domain/action-config';
import type { VersionStrategy } from '../../../src/domain/version-strategy';
import type { ActionInputs } from '../../../src/inputs';

const execMock = vi.hoisted(() => ({
  exec: vi.fn(),
  getExecOutput: vi.fn(),
}));

const githubMock = vi.hoisted(() => ({
  context: {
    repo: { owner: 'jfrz38', repo: 'demo' },
    payload: {
      repository: {
        default_branch: 'main',
      },
    },
  },
  getOctokit: vi.fn(),
}));

vi.mock('@actions/exec', () => execMock);
vi.mock('@actions/github', () => githubMock);

describe('VersionBumpPrUseCase', () => {
  let tempDir: string;
  let octokit: {
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
      pulls: { create: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn> };
      repos: { getReleaseByTag: ReturnType<typeof vi.fn> };
    };
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'version-bump-action-use-case-'));
    fs.writeFileSync(path.join(tempDir, 'build.gradle.kts'), 'version = "1.2.3"\n');
    vi.clearAllMocks();

    octokit = {
      rest: {
        git: {
          createBlob: vi.fn().mockResolvedValue({ data: { sha: 'blob-sha' } }),
          createCommit: vi.fn().mockResolvedValue({ data: { sha: 'commit-sha' } }),
          createRef: vi.fn().mockResolvedValue({ data: { ref: 'refs/heads/chore/bump-version-1.2.4' } }),
          createTree: vi.fn().mockResolvedValue({ data: { sha: 'tree-sha' } }),
          getCommit: vi.fn().mockResolvedValue({ data: { tree: { sha: 'base-tree-sha' } } }),
          getRef: vi.fn().mockImplementation(({ ref }: { ref: string }) => {
            if (ref === 'heads/develop') {
              return Promise.resolve({ data: { object: { sha: 'base-commit-sha' } } });
            }

            return Promise.reject({ status: 404 });
          }),
          updateRef: vi.fn().mockResolvedValue({ data: { ref: 'refs/heads/chore/bump-version-1.2.4' } }),
        },
        pulls: {
          create: vi.fn().mockResolvedValue({ data: { html_url: 'https://github.com/jfrz38/demo/pull/1' } }),
          list: vi.fn().mockResolvedValue({ data: [] }),
        },
        repos: { getReleaseByTag: vi.fn().mockRejectedValue({ status: 404 }) },
      },
    };
    githubMock.getOctokit.mockReturnValue(octokit);
    execMock.exec.mockResolvedValue(0);
    let statusCalls = 0;
    execMock.getExecOutput.mockImplementation((_command: string, args: string[]) => {
      if (args[0] === 'status') {
        statusCalls += 1;
        if (statusCalls === 1) {
          return Promise.resolve({ stdout: '', stderr: '', exitCode: 0 });
        }

        return Promise.resolve({ stdout: ' M build.gradle.kts\0', stderr: '', exitCode: 0 });
      }

      return Promise.resolve({ stdout: '', stderr: '', exitCode: 0 });
    });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('bumps the version, creates a GitHub API commit, and creates a draft pull request', async () => {
    const result = await executeUseCase();

    expect(result).toMatchObject({
      currentVersion: '1.2.3',
      nextVersion: '1.2.4',
      tag: 'v1.2.4',
      branch: 'chore/bump-version-1.2.4',
      prUrl: 'https://github.com/jfrz38/demo/pull/1',
      changedFiles: 'build.gradle.kts',
    });
    expect(fs.readFileSync(path.join(tempDir, 'build.gradle.kts'), 'utf8')).toBe('version = "1.2.4"\n');
    expect(execMock.exec).toHaveBeenCalledWith('git', ['fetch', 'origin', 'develop', '--depth=1']);
    expect(execMock.exec).toHaveBeenCalledWith('git', ['checkout', '-B', 'chore/bump-version-1.2.4', 'origin/develop']);
    expect(execMock.exec).not.toHaveBeenCalledWith('git', ['commit', '-m', 'Bump version to 1.2.4']);
    expect(execMock.exec).not.toHaveBeenCalledWith('git', expect.arrayContaining(['push']));
    expect(octokit.rest.git.createBlob).toHaveBeenCalledWith(
      expect.objectContaining({ content: Buffer.from('version = "1.2.4"\n').toString('base64'), encoding: 'base64' }),
    );
    expect(octokit.rest.git.createTree).toHaveBeenCalledWith(
      expect.objectContaining({
        base_tree: 'base-tree-sha',
        tree: [{ path: 'build.gradle.kts', mode: '100644', type: 'blob', sha: 'blob-sha' }],
      }),
    );
    expect(octokit.rest.git.createCommit).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Bump version to 1.2.4', parents: ['base-commit-sha'], tree: 'tree-sha' }),
    );
    expect(octokit.rest.git.createRef).toHaveBeenCalledWith(
      expect.objectContaining({ ref: 'refs/heads/chore/bump-version-1.2.4', sha: 'commit-sha' }),
    );
    expect(octokit.rest.pulls.create).toHaveBeenCalledWith(
      expect.objectContaining({
        base: 'develop',
        draft: true,
        head: 'chore/bump-version-1.2.4',
        title: 'Bump version to 1.2.4',
      }),
    );
  });

  it('fails before changing files when the remote bump branch already exists without an open pull request', async () => {
    octokit.rest.git.getRef.mockImplementation(({ ref }: { ref: string }) => {
      if (ref === 'heads/chore/bump-version-1.2.4') {
        return Promise.resolve({ data: { object: { sha: 'abc1234567890abcdef' } } });
      }

      return Promise.reject({ status: 404 });
    });

    await expect(executeUseCase()).rejects.toThrow(
      'Branch chore/bump-version-1.2.4 already exists on origin, but no open pull request was found for it. Delete the branch, use a different branch-prefix, or set overwrite-existing-branch to true.',
    );
    expect(fs.readFileSync(path.join(tempDir, 'build.gradle.kts'), 'utf8')).toBe('version = "1.2.3"\n');
    expect(execMock.exec).not.toHaveBeenCalledWith('git', ['checkout', '-B', 'chore/bump-version-1.2.4', 'origin/develop']);
    expect(execMock.exec).not.toHaveBeenCalledWith('git', ['commit', '-m', expect.any(String)]);
    expect(execMock.exec).not.toHaveBeenCalledWith('git', expect.arrayContaining(['push']));
    expect(octokit.rest.git.createCommit).not.toHaveBeenCalled();
  });

  it('updates an existing remote bump branch when explicitly enabled', async () => {
    let statusCalls = 0;
    execMock.getExecOutput.mockImplementation((_command: string, args: string[]) => {
      if (args[0] === 'status') {
        statusCalls += 1;
        if (statusCalls === 1) {
          return Promise.resolve({ stdout: '', stderr: '', exitCode: 0 });
        }

        return Promise.resolve({ stdout: ' M build.gradle.kts\0', stderr: '', exitCode: 0 });
      }
      return Promise.resolve({ stdout: '', stderr: '', exitCode: 0 });
    });
    octokit.rest.git.getRef.mockImplementation(({ ref }: { ref: string }) => {
      if (ref === 'heads/chore/bump-version-1.2.4') {
        return Promise.resolve({ data: { object: { sha: 'abc1234567890abcdef' } } });
      }
      if (ref === 'heads/develop') {
        return Promise.resolve({ data: { object: { sha: 'base-commit-sha' } } });
      }

      return Promise.reject({ status: 404 });
    });

    await executeUseCase({ overwriteExistingBranch: 'true' });

    expect(octokit.rest.git.updateRef).toHaveBeenCalledWith(
      expect.objectContaining({ ref: 'heads/chore/bump-version-1.2.4', sha: 'commit-sha', force: true }),
    );
    expect(octokit.rest.git.createRef).not.toHaveBeenCalled();
    expect(execMock.exec).not.toHaveBeenCalledWith('git', expect.arrayContaining(['push']));
  });

  it('returns an existing open pull request without creating a duplicate', async () => {
    octokit.rest.pulls.list.mockResolvedValue({ data: [{ html_url: 'https://github.com/jfrz38/demo/pull/99' }] });

    const result = await executeUseCase();

    expect(result.prUrl).toBe('https://github.com/jfrz38/demo/pull/99');
    expect(result.changedFiles).toBe('');
    expect(octokit.rest.pulls.create).not.toHaveBeenCalled();
    expect(execMock.exec).not.toHaveBeenCalledWith('git', ['commit', '-m', expect.any(String)]);
    expect(octokit.rest.git.createCommit).not.toHaveBeenCalled();
  });

  it('fails when the tag already exists and the safeguard is enabled', async () => {
    octokit.rest.git.getRef.mockImplementation(({ ref }: { ref: string }) => {
      if (ref === 'tags/v1.2.4') {
        return Promise.resolve({ data: { ref: 'refs/tags/v1.2.4' } });
      }

      return Promise.reject({ status: 404 });
    });

    await expect(executeUseCase()).rejects.toThrow('Tag v1.2.4 already exists');
  });

  it('fails when the release already exists and the safeguard is enabled', async () => {
    octokit.rest.repos.getReleaseByTag.mockResolvedValue({ data: { tag_name: 'v1.2.4' } });

    await expect(executeUseCase()).rejects.toThrow('GitHub Release v1.2.4 already exists');
  });

  it('runs pre-commit commands after bumping the version and commits generated files', async () => {
    fs.mkdirSync(path.join(tempDir, 'dist'));
    fs.writeFileSync(path.join(tempDir, 'dist', 'index.js'), 'generated bundle\n');
    let statusCalls = 0;
    execMock.getExecOutput.mockImplementation((_command: string, args: string[]) => {
      if (args[0] === 'status') {
        statusCalls += 1;
        if (statusCalls === 1) {
          return Promise.resolve({ stdout: '', stderr: '', exitCode: 0 });
        }

        return Promise.resolve({ stdout: ' M build.gradle.kts\0 M dist/index.js\0', stderr: '', exitCode: 0 });
      }

      return Promise.resolve({ stdout: '', stderr: '', exitCode: 0 });
    });

    const result = await executeUseCase({ preCommitCommands: 'make package-github-action' });

    expect(result.changedFiles).toBe('build.gradle.kts\ndist/index.js');
    expect(execMock.exec).toHaveBeenCalledWith('make package-github-action', [], { cwd: tempDir });
    expect(invocationIndex('make package-github-action')).toBeGreaterThan(invocationIndex('git', ['checkout', '-B', 'chore/bump-version-1.2.4', 'origin/develop']));
    expect(octokit.rest.git.createTree).toHaveBeenCalledWith(
      expect.objectContaining({
        tree: expect.arrayContaining([
          expect.objectContaining({ path: 'build.gradle.kts', sha: 'blob-sha' }),
          expect.objectContaining({ path: 'dist/index.js', sha: 'blob-sha' }),
        ]),
      }),
    );
  });

  it('runs multiline pre-commit commands in order', async () => {
    await executeUseCase({ preCommitCommands: 'pnpm install\npnpm run build' });

    expect(invocationIndex('pnpm install')).toBeLessThan(invocationIndex('pnpm run build'));
    expect(octokit.rest.git.createCommit).toHaveBeenCalled();
  });

  it('adds deleted files to the GitHub tree with a null sha', async () => {
    let statusCalls = 0;
    execMock.getExecOutput.mockImplementation((_command: string, args: string[]) => {
      if (args[0] === 'status') {
        statusCalls += 1;
        if (statusCalls === 1) {
          return Promise.resolve({ stdout: '', stderr: '', exitCode: 0 });
        }

        return Promise.resolve({ stdout: ' M build.gradle.kts\0 D generated.txt\0', stderr: '', exitCode: 0 });
      }

      return Promise.resolve({ stdout: '', stderr: '', exitCode: 0 });
    });

    await executeUseCase({ preCommitCommands: 'make package-github-action' });

    expect(octokit.rest.git.createTree).toHaveBeenCalledWith(
      expect.objectContaining({
        tree: expect.arrayContaining([expect.objectContaining({ path: 'generated.txt', mode: '100644', type: 'blob', sha: null })]),
      }),
    );
  });

  async function executeUseCase(inputOverrides: Partial<ActionInputs> = {}) {
    const useCase = new VersionBumpPrUseCase({
      createStrategy: (cwd, config) => new TestVersionStrategy(cwd, config.versionFile),
      renderer: new TemplateRenderer(),
    });

    return useCase.execute(new ActionConfig({ ...baseInputs(), ...inputOverrides }), tempDir);
  }
});

class TestVersionStrategy implements VersionStrategy {
  private readonly filePath: string;

  constructor(cwd: string, versionFile: string) {
    this.filePath = path.resolve(cwd, versionFile);
  }

  async readCurrentVersion(): Promise<string> {
    const content = await fs.promises.readFile(this.filePath, 'utf8');
    const match = /version = "(\d+\.\d+\.\d+)"/.exec(content);
    if (!match) {
      throw new Error('Version not found.');
    }

    return match[1];
  }

  async writeNextVersion(nextVersion: string): Promise<string[]> {
    const content = await fs.promises.readFile(this.filePath, 'utf8');
    await fs.promises.writeFile(this.filePath, content.replace(/version = "\d+\.\d+\.\d+"/, `version = "${nextVersion}"`), 'utf8');
    return [this.filePath];
  }
}

function baseInputs(): ActionInputs {
  return {
    baseBranch: 'develop',
    branchPrefix: 'chore/bump-version-',
    bump: 'patch',
    commitMessage: 'Bump version to {version}',
    draft: 'true',
    failIfReleaseExists: 'true',
    failIfTagExists: 'true',
    githubToken: 'token',
    overwriteExistingBranch: 'false',
    preCommitCommands: '',
    prBody: 'Bumps version from {current-version} to {next-version} using a {bump} release bump.',
    prTitle: 'Bump version to {version}',
    strategy: 'gradle-kts',
    tagPrefix: 'v',
    versionFile: 'build.gradle.kts',
    versionPattern: '',
    versionReplacement: '',
  };
}

function invocationIndex(command: string, args?: string[]): number {
  return execMock.exec.mock.calls.findIndex((call) => {
    if (call[0] !== command) {
      return false;
    }

    return !args || JSON.stringify(call[1]) === JSON.stringify(args);
  });
}
