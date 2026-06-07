import type { ActionConfigInput } from './action-config-input';
import { BooleanInput } from './boolean-input';
import { PreCommitCommands } from './pre-commit-commands';
import { StrategyName } from './strategy-name';
import { Bump } from '../versioning/bump';

export class ActionConfig {
  readonly baseBranch: string;
  readonly branchPrefix: string;
  readonly bump: Bump;
  readonly commitMessage: string;
  readonly draft: boolean;
  readonly failIfReleaseExists: boolean;
  readonly failIfTagExists: boolean;
  readonly githubToken: string;
  readonly overwriteExistingBranch: boolean;
  readonly preCommitCommands: PreCommitCommands;
  readonly prBody: string;
  readonly prTitle: string;
  readonly strategy: StrategyName;
  readonly tagPrefix: string;
  readonly versionFile: string;
  readonly versionPattern: string;
  readonly versionReplacement: string;

  constructor(inputs: ActionConfigInput) {
    this.baseBranch = inputs.baseBranch.trim();
    this.branchPrefix = inputs.branchPrefix || 'chore/bump-version-';
    this.bump = Bump.fromInput(inputs.bump);
    this.commitMessage = inputs.commitMessage || 'Bump version to {version}';
    this.draft = BooleanInput.fromInput('draft', inputs.draft, true).value;
    this.failIfReleaseExists = BooleanInput.fromInput('fail-if-release-exists', inputs.failIfReleaseExists, true).value;
    this.failIfTagExists = BooleanInput.fromInput('fail-if-tag-exists', inputs.failIfTagExists, true).value;
    this.githubToken = inputs.githubToken;
    this.overwriteExistingBranch = BooleanInput.fromInput('overwrite-existing-branch', inputs.overwriteExistingBranch, false).value;
    this.preCommitCommands = PreCommitCommands.fromInput(inputs.preCommitCommands);
    this.prBody = inputs.prBody || 'Bumps version from {current-version} to {next-version} using a {bump} release bump.';
    this.prTitle = inputs.prTitle || 'Bump version to {version}';
    this.strategy = StrategyName.fromInput(inputs.strategy);
    this.tagPrefix = inputs.tagPrefix || 'v';
    this.versionFile = inputs.versionFile.trim();
    this.versionPattern = inputs.versionPattern.trim();
    this.versionReplacement = inputs.versionReplacement;

    if (this.strategy.isRegex()) {
      if (!this.versionPattern) {
        throw new Error('Input "version-pattern" is required when strategy=regex.');
      }
      if (!this.versionReplacement) {
        throw new Error('Input "version-replacement" is required when strategy=regex.');
      }
    }
  }
}
