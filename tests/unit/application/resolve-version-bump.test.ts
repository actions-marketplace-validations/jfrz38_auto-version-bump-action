import { describe, expect, it, vi } from 'vitest';
import { ResolveVersionBump } from '../../../src/application/resolve-version-bump';
import { ActionConfig } from '../../../src/domain/config/action-config';
import type { ActionConfigInput } from '../../../src/domain/config/action-config-input';
import type { DefaultBranchProvider } from '../../../src/domain/ports/default-branch-provider';
import type { VersionStrategy } from '../../../src/domain/versioning/version-strategy';

describe('ResolveVersionBump', () => {
  it('uses the configured base branch when present', async () => {
    const defaultBranchProvider = new MockDefaultBranchProvider('main');

    const plan = await new ResolveVersionBump(createStrategy, defaultBranchProvider).execute(new ActionConfig(baseInputs()), '/workspace');

    expect(plan.baseBranch.name).toBe('develop');
    expect(plan.branch.name).toBe('chore/bump-version-1.2.4');
    expect(plan.tag.name).toBe('v1.2.4');
    expect(defaultBranchProvider.getDefaultBranch).not.toHaveBeenCalled();
  });

  it('falls back to the default branch provider when base branch is empty', async () => {
    const defaultBranchProvider = new MockDefaultBranchProvider('main');

    const plan = await new ResolveVersionBump(createStrategy, defaultBranchProvider).execute(new ActionConfig({ ...baseInputs(), baseBranch: '' }), '/workspace');

    expect(plan.baseBranch.name).toBe('main');
    expect(defaultBranchProvider.getDefaultBranch).toHaveBeenCalledOnce();
  });

  it('fails when no base branch can be resolved', async () => {
    await expect(new ResolveVersionBump(createStrategy, new MockDefaultBranchProvider('')).execute(new ActionConfig({ ...baseInputs(), baseBranch: '' }), '/workspace')).rejects.toThrow(
      'Could not resolve base branch. Provide input "base-branch".',
    );
  });
});

class MockDefaultBranchProvider implements DefaultBranchProvider {
  readonly getDefaultBranch = vi.fn<DefaultBranchProvider['getDefaultBranch']>();

  constructor(defaultBranch: string) {
    this.getDefaultBranch.mockReturnValue(defaultBranch);
  }
}

function createStrategy(): VersionStrategy {
  return {
    getPotentialChangedFiles: vi.fn().mockReturnValue(['/workspace/build.gradle.kts']),
    readCurrentVersion: vi.fn().mockResolvedValue('1.2.3'),
    writeNextVersion: vi.fn(),
  };
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
