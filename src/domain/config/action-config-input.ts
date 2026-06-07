export interface ActionConfigInput {
  baseBranch: string;
  branchPrefix: string;
  bump: string;
  commitMessage: string;
  draft: string;
  failIfReleaseExists: string;
  failIfTagExists: string;
  githubToken: string;
  overwriteExistingBranch: string;
  preCommitCommands: string;
  prBody: string;
  prTitle: string;
  strategy: string;
  tagPrefix: string;
  versionFile: string;
  versionPattern: string;
  versionReplacement: string;
}
