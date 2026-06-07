import { type ActionConfig } from '../domain/config/action-config';
import type { GitRepository } from '../domain/ports/git-repository';
import type { GitHubRepository, PullRequestResult } from '../domain/ports/github-repository';
import type { VersionBumpPlan } from '../domain/version-bump/version-bump-plan';
import { SimpleVersion } from '../domain/versioning/simple-version';
import type { VersionStrategyFactory } from './version-bump-pr-use-case';

export interface PreparedBumpBranch {
  existingPullRequest?: PullRequestResult;
  remoteBranchSha?: string;
}

export class PrepareBumpBranch {
  constructor(
    private readonly github: GitHubRepository,
    private readonly gitRepository: GitRepository,
    private readonly createStrategy: VersionStrategyFactory,
  ) { }

  async execute(config: ActionConfig, cwd: string, plan: VersionBumpPlan): Promise<PreparedBumpBranch> {
    const existingPullRequest = await this.github.findOpenPullRequest(plan.baseBranch.name, plan.branch.name);
    if (existingPullRequest) {
      return { existingPullRequest };
    }

    const remoteBranchSha = await this.github.getBranchRefSha(plan.branch.name);
    plan.branch.assertCanUseRemoteState(remoteBranchSha, config.overwriteExistingBranch);

    await this.gitRepository.checkoutBumpBranch(plan.baseBranch.name, plan.branch.name);
    await this.assertVersionDidNotChange(config, cwd, plan);

    return { remoteBranchSha };
  }

  private async assertVersionDidNotChange(config: ActionConfig, cwd: string, plan: VersionBumpPlan): Promise<void> {
    const strategy = this.createStrategy(cwd, config);
    const branchCurrentVersion = SimpleVersion.parse(await strategy.readCurrentVersion()).toString();
    if (branchCurrentVersion !== plan.currentVersionText) {
      throw new Error(`Version changed after checking out ${plan.baseBranch.name}: expected ${plan.currentVersionText}, found ${branchCurrentVersion}.`);
    }
  }
}
