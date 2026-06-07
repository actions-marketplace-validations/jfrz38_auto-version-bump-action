import { type ActionConfig } from '../domain/config/action-config';
import type { DefaultBranchProvider } from '../domain/ports/default-branch-provider';
import { Branch } from '../domain/release-proposal/branch';
import { Tag } from '../domain/release-proposal/tag';
import { VersionBumpPlan } from '../domain/version-bump/version-bump-plan';
import { SimpleVersion } from '../domain/versioning/simple-version';
import type { VersionStrategyFactory } from './version-bump-pr-use-case';

export class ResolveVersionBump {
  constructor(
    private readonly createStrategy: VersionStrategyFactory,
    private readonly defaultBranchProvider: DefaultBranchProvider,
  ) { }

  async execute(config: ActionConfig, cwd: string): Promise<VersionBumpPlan> {
    const strategy = this.createStrategy(cwd, config);
    const currentVersion = SimpleVersion.parse(await strategy.readCurrentVersion());
    const nextVersion = currentVersion.bump(config.bump.value);
    const branch = Branch.forVersion(config.branchPrefix, nextVersion);
    const tag = Tag.forVersion(config.tagPrefix, nextVersion);
    const baseBranchName = config.baseBranch || this.defaultBranchProvider.getDefaultBranch();

    if (!baseBranchName) {
      throw new Error('Could not resolve base branch. Provide input "base-branch".');
    }

    return new VersionBumpPlan(currentVersion, nextVersion, Branch.fromName(baseBranchName), branch, tag);
  }
}
