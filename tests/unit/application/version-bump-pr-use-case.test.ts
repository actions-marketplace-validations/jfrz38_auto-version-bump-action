import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TemplateRenderer } from '../../../src/application/template-renderer';
import { VersionBumpPrUseCase } from '../../../src/application/version-bump-pr-use-case';
import { ActionConfig } from '../../../src/domain/config/action-config';
import type { ActionConfigInput } from '../../../src/domain/config/action-config-input';
import type { CommandExecutor } from '../../../src/domain/ports/command-executor';
import type { DefaultBranchProvider } from '../../../src/domain/ports/default-branch-provider';
import type { GitPathResolver } from '../../../src/domain/ports/git-path-resolver';
import type { GitRepository } from '../../../src/domain/ports/git-repository';
import type { GitHubRepository } from '../../../src/domain/ports/github-repository';
import type { VersionStrategy } from '../../../src/domain/versioning/version-strategy';

describe('VersionBumpPrUseCase', () => {
  let commandExecutor: MockCommandExecutor;
  let defaultBranchProvider: MockDefaultBranchProvider;
  let gitPathResolver: TestGitPathResolver;
  let gitRepository: MockGitRepository;
  let githubRepository: MockGitHubRepository;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'version-bump-action-use-case-'));
    fs.writeFileSync(path.join(tempDir, 'build.gradle.kts'), 'version = "1.2.3"\n');
    commandExecutor = new MockCommandExecutor();
    defaultBranchProvider = new MockDefaultBranchProvider();
    gitPathResolver = new TestGitPathResolver();
    gitRepository = new MockGitRepository();
    githubRepository = new MockGitHubRepository();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('bumps the version, creates a branch commit, and creates a draft pull request', async () => {
    const result = await executeUseCase();

    expect(result).toMatchObject({
      branch: 'chore/bump-version-1.2.4',
      changedFiles: 'build.gradle.kts',
      currentVersion: '1.2.3',
      nextVersion: '1.2.4',
      prUrl: 'https://github.com/jfrz38/demo/pull/1',
      tag: 'v1.2.4',
    });
    expect(fs.readFileSync(path.join(tempDir, 'build.gradle.kts'), 'utf8')).toBe('version = "1.2.4"\n');
    expect(gitRepository.checkoutBumpBranch).toHaveBeenCalledWith('develop', 'chore/bump-version-1.2.4');
    expect(githubRepository.createCommitOnBranch).toHaveBeenCalledWith({
      baseBranch: 'develop',
      branch: 'chore/bump-version-1.2.4',
      changedFiles: ['build.gradle.kts'],
      commitMessage: 'Bump version to 1.2.4',
      cwd: tempDir,
      remoteBranchSha: undefined,
    });
    expect(githubRepository.createPullRequest).toHaveBeenCalledWith({
      baseBranch: 'develop',
      branch: 'chore/bump-version-1.2.4',
      draft: true,
      prBody: 'Bumps version from 1.2.3 to 1.2.4 using a patch release bump.',
      prTitle: 'Bump version to 1.2.4',
    });
  });

  it('fails before changing files when the remote bump branch already exists without an open pull request', async () => {
    githubRepository.getBranchRefSha.mockResolvedValue('abc1234567890abcdef');

    await expect(executeUseCase()).rejects.toThrow(
      'Branch chore/bump-version-1.2.4 already exists on origin, but no open pull request was found for it. Delete the branch, use a different branch-prefix, or set overwrite-existing-branch to true.',
    );

    expect(fs.readFileSync(path.join(tempDir, 'build.gradle.kts'), 'utf8')).toBe('version = "1.2.3"\n');
    expect(gitRepository.checkoutBumpBranch).not.toHaveBeenCalled();
    expect(githubRepository.createCommitOnBranch).not.toHaveBeenCalled();
    expect(githubRepository.createPullRequest).not.toHaveBeenCalled();
  });

  it('passes the remote branch sha when overwriting an existing bump branch', async () => {
    githubRepository.getBranchRefSha.mockResolvedValue('abc1234567890abcdef');

    await executeUseCase({ overwriteExistingBranch: 'true' });

    expect(githubRepository.createCommitOnBranch).toHaveBeenCalledWith(expect.objectContaining({ remoteBranchSha: 'abc1234567890abcdef' }));
  });

  it('returns an existing open pull request without creating a duplicate', async () => {
    githubRepository.findOpenPullRequest.mockResolvedValue({ url: 'https://github.com/jfrz38/demo/pull/99' });

    const result = await executeUseCase();

    expect(result.prUrl).toBe('https://github.com/jfrz38/demo/pull/99');
    expect(result.changedFiles).toBe('');
    expect(gitRepository.checkoutBumpBranch).not.toHaveBeenCalled();
    expect(githubRepository.createCommitOnBranch).not.toHaveBeenCalled();
    expect(githubRepository.createPullRequest).not.toHaveBeenCalled();
  });

  it('fails when the tag already exists and the safeguard is enabled', async () => {
    githubRepository.assertTagDoesNotExist.mockRejectedValue(new Error('Tag v1.2.4 already exists'));

    await expect(executeUseCase()).rejects.toThrow('Tag v1.2.4 already exists');
  });

  it('fails when the release already exists and the safeguard is enabled', async () => {
    githubRepository.assertReleaseDoesNotExist.mockRejectedValue(new Error('GitHub Release v1.2.4 already exists'));

    await expect(executeUseCase()).rejects.toThrow('GitHub Release v1.2.4 already exists');
  });

  it('runs pre-commit commands after bumping the version and commits generated files', async () => {
    fs.mkdirSync(path.join(tempDir, 'dist'));
    fs.writeFileSync(path.join(tempDir, 'dist', 'index.js'), 'generated bundle\n');
    gitRepository.changedFiles = [[], ['build.gradle.kts', 'dist/index.js']];

    const result = await executeUseCase({ preCommitCommands: 'make package-github-action' });

    expect(result.changedFiles).toBe('build.gradle.kts\ndist/index.js');
    expect(commandExecutor.exec).toHaveBeenCalledWith('make package-github-action', [], { cwd: tempDir });
    expect(githubRepository.createCommitOnBranch).toHaveBeenCalledWith(expect.objectContaining({ changedFiles: ['build.gradle.kts', 'dist/index.js'] }));
  });

  it('runs multiline pre-commit commands in order', async () => {
    await executeUseCase({ preCommitCommands: 'pnpm install\npnpm run build' });

    expect(commandExecutor.exec.mock.calls).toEqual([
      ['pnpm install', [], { cwd: tempDir }],
      ['pnpm run build', [], { cwd: tempDir }],
    ]);
    expect(githubRepository.createCommitOnBranch).toHaveBeenCalled();
  });

  it('passes all changed files to the commit writer after pre-commit commands', async () => {
    gitRepository.changedFiles = [[], ['build.gradle.kts', 'generated.txt']];

    await executeUseCase({ preCommitCommands: 'make package-github-action' });

    expect(githubRepository.createCommitOnBranch).toHaveBeenCalledWith(expect.objectContaining({ changedFiles: ['build.gradle.kts', 'generated.txt'] }));
  });

  async function executeUseCase(inputOverrides: Partial<ActionConfigInput> = {}) {
    const useCase = new VersionBumpPrUseCase({
      commandExecutor,
      createGitHubRepository: vi.fn().mockReturnValue(githubRepository),
      createStrategy: (cwd, config) => new TestVersionStrategy(cwd, config.versionFile),
      defaultBranchProvider,
      gitPathResolver,
      gitRepository,
      renderer: new TemplateRenderer(),
    });

    return useCase.execute(new ActionConfig({ ...baseInputs(), ...inputOverrides }), tempDir);
  }
});

class MockCommandExecutor implements CommandExecutor {
  readonly exec = vi.fn<CommandExecutor['exec']>().mockResolvedValue(undefined);
}

class MockDefaultBranchProvider implements DefaultBranchProvider {
  getDefaultBranch(): string {
    return 'main';
  }
}

class TestGitPathResolver implements GitPathResolver {
  toGitPath(cwd: string, filePath: string): string {
    if (!path.isAbsolute(filePath)) {
      return filePath.replace(/\\/g, '/');
    }

    return path.relative(cwd, filePath).replace(/\\/g, '/');
  }
}

class MockGitRepository implements GitRepository {
  changedFiles: string[][] = [[], ['build.gradle.kts']];
  readonly checkoutBumpBranch = vi.fn<GitRepository['checkoutBumpBranch']>().mockResolvedValue(undefined);
  readonly getChangedFiles = vi.fn<GitRepository['getChangedFiles']>().mockImplementation(() => Promise.resolve(this.changedFiles.shift() ?? []));
}

class MockGitHubRepository implements GitHubRepository {
  readonly assertReleaseDoesNotExist = vi.fn<GitHubRepository['assertReleaseDoesNotExist']>().mockResolvedValue(undefined);
  readonly assertTagDoesNotExist = vi.fn<GitHubRepository['assertTagDoesNotExist']>().mockResolvedValue(undefined);
  readonly createCommitOnBranch = vi.fn<GitHubRepository['createCommitOnBranch']>().mockResolvedValue(undefined);
  readonly createPullRequest = vi.fn<GitHubRepository['createPullRequest']>().mockResolvedValue({ url: 'https://github.com/jfrz38/demo/pull/1' });
  readonly findOpenPullRequest = vi.fn<GitHubRepository['findOpenPullRequest']>().mockResolvedValue(undefined);
  readonly getBranchRefSha = vi.fn<GitHubRepository['getBranchRefSha']>().mockResolvedValue(undefined);
}

class TestVersionStrategy implements VersionStrategy {
  private readonly filePath: string;

  constructor(cwd: string, versionFile: string) {
    this.filePath = path.resolve(cwd, versionFile);
  }

  getPotentialChangedFiles(): string[] {
    return [this.filePath];
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

function baseInputs(): ActionConfigInput {
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
