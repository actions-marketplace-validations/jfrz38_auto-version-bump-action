import { describe, expect, it, vi } from 'vitest';
import { EnsureReleaseTargetIsAvailable } from '../../../src/application/ensure-release-target-is-available';
import { ActionConfig } from '../../../src/domain/config/action-config';
import type { ActionConfigInput } from '../../../src/domain/config/action-config-input';
import type { GitHubRepository } from '../../../src/domain/ports/github-repository';
import { Branch } from '../../../src/domain/release-proposal/branch';
import { Tag } from '../../../src/domain/release-proposal/tag';
import { VersionBumpPlan } from '../../../src/domain/version-bump/version-bump-plan';
import { SimpleVersion } from '../../../src/domain/versioning/simple-version';

describe('EnsureReleaseTargetIsAvailable', () => {
  it('checks tag and release existence when safeguards are enabled', async () => {
    const github = new MockGitHubRepository();

    await new EnsureReleaseTargetIsAvailable(github).execute(new ActionConfig(baseInputs()), plan());

    expect(github.assertTagDoesNotExist).toHaveBeenCalledWith('v1.2.4');
    expect(github.assertReleaseDoesNotExist).toHaveBeenCalledWith('v1.2.4');
  });

  it('skips disabled safeguards', async () => {
    const github = new MockGitHubRepository();

    await new EnsureReleaseTargetIsAvailable(github).execute(new ActionConfig({ ...baseInputs(), failIfReleaseExists: 'false', failIfTagExists: 'false' }), plan());

    expect(github.assertTagDoesNotExist).not.toHaveBeenCalled();
    expect(github.assertReleaseDoesNotExist).not.toHaveBeenCalled();
  });
});

class MockGitHubRepository implements GitHubRepository {
  readonly assertReleaseDoesNotExist = vi.fn<GitHubRepository['assertReleaseDoesNotExist']>().mockResolvedValue(undefined);
  readonly assertTagDoesNotExist = vi.fn<GitHubRepository['assertTagDoesNotExist']>().mockResolvedValue(undefined);
  readonly createCommitOnBranch = vi.fn<GitHubRepository['createCommitOnBranch']>().mockResolvedValue(undefined);
  readonly createPullRequest = vi.fn<GitHubRepository['createPullRequest']>();
  readonly findOpenPullRequest = vi.fn<GitHubRepository['findOpenPullRequest']>();
  readonly getBranchRefSha = vi.fn<GitHubRepository['getBranchRefSha']>();
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
