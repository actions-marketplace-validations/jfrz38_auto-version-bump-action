import * as core from '@actions/core';
import type { ActionConfigInput } from './domain/config/action-config-input';

export type ActionInputs = ActionConfigInput;

export function readInputs(): ActionInputs {
  return {
    baseBranch: core.getInput('base-branch'),
    branchPrefix: core.getInput('branch-prefix'),
    bump: core.getInput('bump', { required: true }),
    commitMessage: core.getInput('commit-message'),
    draft: core.getInput('draft'),
    failIfReleaseExists: core.getInput('fail-if-release-exists'),
    failIfTagExists: core.getInput('fail-if-tag-exists'),
    githubToken: core.getInput('github-token'),
    overwriteExistingBranch: core.getInput('overwrite-existing-branch'),
    preCommitCommands: core.getInput('pre-commit-commands'),
    prBody: core.getInput('pr-body'),
    prTitle: core.getInput('pr-title'),
    strategy: core.getInput('strategy', { required: true }),
    tagPrefix: core.getInput('tag-prefix'),
    versionFile: core.getInput('version-file', { required: true }),
    versionPattern: core.getInput('version-pattern'),
    versionReplacement: core.getInput('version-replacement'),
  };
}
