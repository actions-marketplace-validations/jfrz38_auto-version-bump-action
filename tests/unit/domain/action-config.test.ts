import { describe, expect, it } from 'vitest';
import { ActionConfig } from '../../../src/domain/config/action-config';
import type { ActionConfigInput } from '../../../src/domain/config/action-config-input';

describe('ActionConfig', () => {
  it('builds a validated action config from raw inputs', () => {
    const config = new ActionConfig({
      ...baseInputs(),
      strategy: 'regex',
      versionPattern: 'version=(\\d+\\.\\d+\\.\\d+)',
      versionReplacement: 'version={version}',
    });

    expect(config.strategy.value).toBe('regex');
    expect(config.bump.value).toBe('patch');
    expect(config.draft).toBe(true);
    expect(config.overwriteExistingBranch).toBe(false);
    expect(config.preCommitCommands.values).toEqual([]);
  });

  it('builds pre-commit commands from raw input', () => {
    const config = new ActionConfig({ ...baseInputs(), preCommitCommands: 'pnpm install\n\n pnpm run build ' });

    expect(config.preCommitCommands.values).toEqual(['pnpm install', 'pnpm run build']);
  });

  it('requires regex pattern and replacement for regex strategy', () => {
    expect(() => new ActionConfig({ ...baseInputs(), strategy: 'regex' })).toThrow('version-pattern');
    expect(() => new ActionConfig({ ...baseInputs(), strategy: 'regex', versionPattern: 'v(\\d+\\.\\d+\\.\\d+)' })).toThrow(
      'version-replacement',
    );
  });
});

function baseInputs(): ActionConfigInput {
  return {
    baseBranch: 'develop',
    branchPrefix: '',
    bump: 'patch',
    commitMessage: '',
    draft: '',
    failIfReleaseExists: '',
    failIfTagExists: '',
    githubToken: 'token',
    overwriteExistingBranch: '',
    preCommitCommands: '',
    prBody: '',
    prTitle: '',
    strategy: 'gradle-kts',
    tagPrefix: '',
    versionFile: 'build.gradle.kts',
    versionPattern: '',
    versionReplacement: '',
  };
}
