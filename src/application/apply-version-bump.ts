import fs from 'node:fs/promises';
import path from 'node:path';
import { type ActionConfig } from '../domain/config/action-config';
import type { GitPathResolver } from '../domain/ports/git-path-resolver';
import type { GitRepository } from '../domain/ports/git-repository';
import { ChangedFiles } from '../domain/version-bump/changed-files';
import type { VersionBumpPlan } from '../domain/version-bump/version-bump-plan';
import { PreCommitCommandsRunner } from './pre-commit-commands-runner';
import type { VersionStrategyFactory } from './version-bump-pr-use-case';

export class ApplyVersionBump {
  constructor(
    private readonly createStrategy: VersionStrategyFactory,
    private readonly gitRepository: GitRepository,
    private readonly preCommitCommandsRunner: PreCommitCommandsRunner,
    private readonly gitPathResolver: GitPathResolver,
  ) { }

  async execute(config: ActionConfig, cwd: string, plan: VersionBumpPlan): Promise<ChangedFiles> {
    const strategy = this.createStrategy(cwd, config);
    const beforeContents = await this.snapshotFiles(cwd, strategy.getPotentialChangedFiles());
    const baselineChangedFiles = await this.gitRepository.getChangedFiles();
    const changedFiles = ChangedFiles.from((await strategy.writeNextVersion(plan.nextVersionText)).map((filePath) => this.gitPathResolver.toGitPath(cwd, filePath)));
    const changedAfterWrite = ChangedFiles.from(await this.filterActuallyChangedFiles(cwd, changedFiles.values, beforeContents));

    changedAfterWrite.assertNotEmpty();

    const changedAfterCommands = ChangedFiles.from(await this.preCommitCommandsRunner.run(cwd, config.preCommitCommands, baselineChangedFiles));
    changedAfterCommands.assertNotEmpty();
    return changedAfterCommands;
  }

  private async snapshotFiles(cwd: string, files: string[]): Promise<Map<string, string | undefined>> {
    const snapshots = new Map<string, string | undefined>();
    for (const filePath of files) {
      const gitPath = this.gitPathResolver.toGitPath(cwd, filePath);
      try {
        snapshots.set(gitPath, await fs.readFile(path.resolve(cwd, gitPath), 'utf8'));
      } catch {
        snapshots.set(gitPath, undefined);
      }
    }
    return snapshots;
  }

  private async filterActuallyChangedFiles(cwd: string, files: string[], beforeContents: Map<string, string | undefined>): Promise<string[]> {
    const changedFiles: string[] = [];
    for (const filePath of files) {
      const gitPath = this.gitPathResolver.toGitPath(cwd, filePath);
      let currentContent: string | undefined;
      try {
        currentContent = await fs.readFile(path.resolve(cwd, gitPath), 'utf8');
      } catch {
        currentContent = undefined;
      }
      if (beforeContents.get(gitPath) !== currentContent || !beforeContents.has(gitPath)) {
        changedFiles.push(gitPath);
      }
    }
    return changedFiles;
  }
}
