import { type ActionConfig } from '../domain/config/action-config';
import type { CommandExecutor } from '../domain/ports/command-executor';
import type { DefaultBranchProvider } from '../domain/ports/default-branch-provider';
import type { GitPathResolver } from '../domain/ports/git-path-resolver';
import type { GitRepository } from '../domain/ports/git-repository';
import type { GitHubRepositoryFactory } from '../domain/ports/github-repository';
import { type VersionStrategy } from '../domain/versioning/version-strategy';
import { ApplyVersionBump } from './apply-version-bump';
import { CreateVersionBumpPr } from './create-version-bump-pr';
import { EnsureReleaseTargetIsAvailable } from './ensure-release-target-is-available';
import { PreCommitCommandsRunner } from './pre-commit-commands-runner';
import { PrepareBumpBranch } from './prepare-bump-branch';
import { ResolveVersionBump } from './resolve-version-bump';
import { type TemplateRenderService } from './template-renderer';

export interface ActionOutputs {
  branch: string;
  changedFiles: string;
  currentVersion: string;
  nextVersion: string;
  prUrl: string;
  tag: string;
}

export type VersionStrategyFactory = (cwd: string, config: ActionConfig) => VersionStrategy;

export interface VersionBumpPrUseCaseDependencies {
  commandExecutor: CommandExecutor;
  createGitHubRepository: GitHubRepositoryFactory;
  createStrategy: VersionStrategyFactory;
  defaultBranchProvider: DefaultBranchProvider;
  gitPathResolver: GitPathResolver;
  gitRepository: GitRepository;
  renderer: TemplateRenderService;
}

export class VersionBumpPrUseCase {
  constructor(private readonly dependencies: VersionBumpPrUseCaseDependencies) { }

  async execute(config: ActionConfig, cwd: string): Promise<ActionOutputs> {
    const github = this.dependencies.createGitHubRepository(config.githubToken);
    const preCommitCommandsRunner = new PreCommitCommandsRunner(this.dependencies.commandExecutor, this.dependencies.gitRepository);

    const plan = await new ResolveVersionBump(this.dependencies.createStrategy, this.dependencies.defaultBranchProvider).execute(config, cwd);
    await new EnsureReleaseTargetIsAvailable(github).execute(config, plan);

    const preparedBranch = await new PrepareBumpBranch(github, this.dependencies.gitRepository, this.dependencies.createStrategy).execute(config, cwd, plan);
    if (preparedBranch.existingPullRequest) {
      return {
        branch: plan.branch.name,
        changedFiles: '',
        currentVersion: plan.currentVersionText,
        nextVersion: plan.nextVersionText,
        prUrl: preparedBranch.existingPullRequest.url,
        tag: plan.tag.name,
      };
    }

    const changedFiles = await new ApplyVersionBump(
      this.dependencies.createStrategy,
      this.dependencies.gitRepository,
      preCommitCommandsRunner,
      this.dependencies.gitPathResolver,
    ).execute(config, cwd, plan);
    const pullRequest = await new CreateVersionBumpPr(github, this.dependencies.renderer).execute(config, cwd, plan, changedFiles, preparedBranch.remoteBranchSha);

    return {
      branch: plan.branch.name,
      changedFiles: changedFiles.toOutputString(),
      currentVersion: plan.currentVersionText,
      nextVersion: plan.nextVersionText,
      prUrl: pullRequest.url,
      tag: plan.tag.name,
    };
  }
}
