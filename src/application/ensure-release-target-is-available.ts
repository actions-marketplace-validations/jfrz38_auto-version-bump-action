import { type ActionConfig } from '../domain/config/action-config';
import type { GitHubRepository } from '../domain/ports/github-repository';
import type { VersionBumpPlan } from '../domain/version-bump/version-bump-plan';

export class EnsureReleaseTargetIsAvailable {
  constructor(private readonly github: GitHubRepository) { }

  async execute(config: ActionConfig, plan: VersionBumpPlan): Promise<void> {
    if (config.failIfTagExists) {
      await this.github.assertTagDoesNotExist(plan.tag.name);
    }
    if (config.failIfReleaseExists) {
      await this.github.assertReleaseDoesNotExist(plan.tag.name);
    }
  }
}
