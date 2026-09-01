import { type ActionConfig } from '../domain/config/action-config';
import type { GitHubRepository, PullRequestResult } from '../domain/ports/github-repository';
import { Commit } from '../domain/release-proposal/commit';
import { PullRequest } from '../domain/release-proposal/pull-request';
import type { ChangedFiles } from '../domain/version-bump/changed-files';
import type { VersionBumpPlan } from '../domain/version-bump/version-bump-plan';
import { type TemplateRenderService } from './template-renderer';

export class CreateVersionBumpPr {
  constructor(
    private readonly github: GitHubRepository,
    private readonly renderer: TemplateRenderService,
  ) { }

  async execute(config: ActionConfig, cwd: string, plan: VersionBumpPlan, changedFiles: ChangedFiles, remoteBranchSha?: string): Promise<PullRequestResult> {
    const templateValues = { bump: config.bump.value, currentVersion: plan.currentVersionText, nextVersion: plan.nextVersionText };
    const commit = Commit.create(this.renderer.render(config.commitMessage, templateValues));
    const pullRequestRequest = PullRequest.create(
      plan.baseBranch,
      plan.branch,
      config.draft,
      this.renderer.render(config.prTitle, templateValues),
      this.renderer.render(config.prBody, templateValues),
      plan.tag,
    );

    await this.github.createCommitOnBranch({
      baseBranch: plan.baseBranch.name,
      branch: plan.branch.name,
      changedFiles: changedFiles.values,
      commitMessage: commit.message,
      cwd,
      remoteBranchSha,
    });

    return this.github.createPullRequest({
      baseBranch: pullRequestRequest.baseBranch.name,
      branch: pullRequestRequest.headBranch.name,
      draft: pullRequestRequest.draft,
      prBody: pullRequestRequest.body,
      prTitle: pullRequestRequest.title,
    });
  }
}
