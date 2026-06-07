import * as core from '@actions/core';
import { type ActionOutputs, VersionBumpPrUseCase } from './application/version-bump-pr-use-case';
import { TemplateRenderer } from './application/template-renderer';
import { ActionConfig } from './domain/config/action-config';
import { ActionsCommandExecutor } from './infrastructure/command/actions-command-executor';
import { LocalGitRepository } from './infrastructure/git/local-git';
import { NodeGitPathResolver } from './infrastructure/git/git-path';
import { GitHubDefaultBranchProvider } from './infrastructure/github';
import { GitHubGateway } from './infrastructure/github';
import { createStrategy } from './infrastructure/strategies';
import { readInputs } from './inputs';

export async function run(): Promise<ActionOutputs> {
  const useCase = new VersionBumpPrUseCase({
    commandExecutor: new ActionsCommandExecutor(),
    createGitHubRepository: GitHubGateway.create,
    createStrategy,
    defaultBranchProvider: new GitHubDefaultBranchProvider(),
    gitPathResolver: new NodeGitPathResolver(),
    gitRepository: new LocalGitRepository(),
    renderer: new TemplateRenderer(),
  });
  const outputs = await useCase.execute(new ActionConfig(readInputs()), process.cwd());
  setOutputs(outputs);
  return outputs;
}

function setOutputs(outputs: ActionOutputs): void {
  core.setOutput('current-version', outputs.currentVersion);
  core.setOutput('next-version', outputs.nextVersion);
  core.setOutput('tag', outputs.tag);
  core.setOutput('branch', outputs.branch);
  core.setOutput('pr-url', outputs.prUrl);
  core.setOutput('changed-files', outputs.changedFiles);
}

if (require.main === module) {
  run().catch((error) => {
    core.setFailed(error instanceof Error ? error.message : String(error));
  });
}
