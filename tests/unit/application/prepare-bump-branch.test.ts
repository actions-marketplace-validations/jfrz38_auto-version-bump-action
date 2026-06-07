import { describe, expect, it, vi } from 'vitest';
import { PrepareBumpBranch } from '../../../src/application/prepare-bump-branch';
import { ActionConfig } from '../../../src/domain/config/action-config';
import type { ActionConfigInput } from '../../../src/domain/config/action-config-input';
import type { GitRepository } from '../../../src/domain/ports/git-repository';
import type { GitHubRepository } from '../../../src/domain/ports/github-repository';
import { Branch } from '../../../src/domain/release-proposal/branch';
import { Tag } from '../../../src/domain/release-proposal/tag';
import { VersionBumpPlan } from '../../../src/domain/version-bump/version-bump-plan';
import { SimpleVersion } from '../../../src/domain/versioning/simple-version';
import type { VersionStrategy } from '../../../src/domain/versioning/version-strategy';

describe('PrepareBumpBranch', () => {
  it('returns an existing pull request before checking out the branch', async () => {
    const github = new MockGitHubRepository();
    const gitRepository = new MockGitRepository();
    github.findOpenPullRequest.mockResolvedValue({ url: 'https://github.com/jfrz38/demo/pull/99' });

    await expect(new PrepareBumpBranch(github, gitRepository, createStrategy('1.2.3')).execute(new ActionConfig(baseInputs()), '/workspace', plan())).resolves.toEqual({
      existingPullRequest: { url: 'https://github.com/jfrz38/demo/pull/99' },
    });

    expect(github.getBranchRefSha).not.toHaveBeenCalled();
    expect(gitRepository.checkoutBumpBranch).not.toHaveBeenCalled();
  });

  it('checks out the bump branch and returns the remote branch sha', async () => {
    const github = new MockGitHubRepository();
    const gitRepository = new MockGitRepository();
    github.getBranchRefSha.mockResolvedValue('remote-branch-sha');

    await expect(new PrepareBumpBranch(github, gitRepository, createStrategy('1.2.3')).execute(new ActionConfig({ ...baseInputs(), overwriteExistingBranch: 'true' }), '/workspace', plan())).resolves.toEqual({
      remoteBranchSha: 'remote-branch-sha',
    });

    expect(gitRepository.checkoutBumpBranch).toHaveBeenCalledWith('develop', 'chore/bump-version-1.2.4');
  });

  it('fails when checkout changes the current version', async () => {
    await expect(new PrepareBumpBranch(new MockGitHubRepository(), new MockGitRepository(), createStrategy('1.2.4')).execute(new ActionConfig(baseInputs()), '/workspace', plan())).rejects.toThrow(
      'Version changed after checking out develop: expected 1.2.3, found 1.2.4.',
    );
  });
});

class MockGitRepository implements GitRepository {
  readonly checkoutBumpBranch = vi.fn<GitRepository['checkoutBumpBranch']>().mockResolvedValue(undefined);
  readonly getChangedFiles = vi.fn<GitRepository['getChangedFiles']>();
}

class MockGitHubRepository implements GitHubRepository {
  readonly assertReleaseDoesNotExist = vi.fn<GitHubRepository['assertReleaseDoesNotExist']>();
  readonly assertTagDoesNotExist = vi.fn<GitHubRepository['assertTagDoesNotExist']>();
  readonly createCommitOnBranch = vi.fn<GitHubRepository['createCommitOnBranch']>();
  readonly createPullRequest = vi.fn<GitHubRepository['createPullRequest']>();
  readonly findOpenPullRequest = vi.fn<GitHubRepository['findOpenPullRequest']>().mockResolvedValue(undefined);
  readonly getBranchRefSha = vi.fn<GitHubRepository['getBranchRefSha']>().mockResolvedValue(undefined);
}

function createStrategy(currentVersion: string): () => VersionStrategy {
  return () => ({
    getPotentialChangedFiles: vi.fn().mockReturnValue(['/workspace/build.gradle.kts']),
    readCurrentVersion: vi.fn().mockResolvedValue(currentVersion),
    writeNextVersion: vi.fn(),
  });
}

function plan(): VersionBumpPlan {
  return new VersionBumpPlan(
    SimpleVersion.parse('1.2.3'),
    SimpleVersion.parse('1.2.4'),
    Branch.fromName('develop'),
    Branch.fromName('chore/bump-version-1.2.4'),
    Tag.forVersion('v', SimpleVersion.parse('1.2.4')),
  );
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
