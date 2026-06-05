import fs from 'node:fs/promises';
import path from 'node:path';
import { type ActionConfig } from '../domain/action-config';
import { Branch } from '../domain/branch';
import { Commit } from '../domain/commit';
import { PullRequest } from '../domain/pull-request';
import { SimpleVersion } from '../domain/simple-version';
import { Tag } from '../domain/tag';
import { type VersionStrategy } from '../domain/version-strategy';
import { assertReleaseDoesNotExist, assertTagDoesNotExist, createGitHubClient, createPullRequest, findOpenPullRequest, getDefaultBranch } from '../github';
import { checkoutBumpBranch, commitAndPush, getChangedFiles, getRemoteBranchSha } from '../git';
import { toGitPath, uniqueValues } from '../path-utils';
import { PreCommitCommandsRunner } from './pre-commit-commands-runner';
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
  createStrategy: VersionStrategyFactory;
  renderer: TemplateRenderService;
}

export class VersionBumpPrUseCase {
  constructor(private readonly dependencies: VersionBumpPrUseCaseDependencies) {}

  async execute(config: ActionConfig, cwd: string): Promise<ActionOutputs> {
    return executeVersionBumpPr(config, cwd, this.dependencies.createStrategy, this.dependencies.renderer);
  }
}

async function executeVersionBumpPr(
  config: ActionConfig,
  cwd: string,
  createStrategy: VersionStrategyFactory,
  renderer: TemplateRenderService,
): Promise<ActionOutputs> {
  const octokit = createGitHubClient(config.githubToken);
  const initialStrategy = createStrategy(cwd, config);
  const currentVersion = SimpleVersion.parse(await initialStrategy.readCurrentVersion());
  const nextVersion = currentVersion.bump(config.bump.value);
  const currentVersionText = currentVersion.toString();
  const nextVersionText = nextVersion.toString();
  const branch = Branch.forVersion(config.branchPrefix, nextVersion);
  const tag = Tag.forVersion(config.tagPrefix, nextVersion);
  const baseBranchName = config.baseBranch || getDefaultBranch();

  if (!baseBranchName) {
    throw new Error('Could not resolve base branch. Provide input "base-branch".');
  }
  const baseBranch = Branch.fromName(baseBranchName);

  if (config.failIfTagExists) {
    await assertTagDoesNotExist(octokit, tag.name);
  }
  if (config.failIfReleaseExists) {
    await assertReleaseDoesNotExist(octokit, tag.name);
  }

  const existingPullRequest = await findOpenPullRequest(octokit, baseBranch.name, branch.name);
  if (existingPullRequest) {
    return {
      branch: branch.name,
      changedFiles: '',
      currentVersion: currentVersionText,
      nextVersion: nextVersionText,
      prUrl: existingPullRequest.url,
      tag: tag.name,
    };
  }

  const remoteBranchSha = await getRemoteBranchSha(branch.name);
  branch.assertCanUseRemoteState(remoteBranchSha, config.overwriteExistingBranch);

  await checkoutBumpBranch(baseBranch.name, branch.name);

  const strategy = createStrategy(cwd, config);
  const branchCurrentVersion = SimpleVersion.parse(await strategy.readCurrentVersion()).toString();
  if (branchCurrentVersion !== currentVersionText) {
    throw new Error(`Version changed after checking out ${baseBranch.name}: expected ${currentVersionText}, found ${branchCurrentVersion}.`);
  }

  const beforeContents = await snapshotFiles(cwd, potentialChangedFiles(config.versionFile));
  const baselineChangedFiles = await getChangedFiles();
  const changedFiles = uniqueValues((await strategy.writeNextVersion(nextVersionText)).map((filePath) => toGitPath(cwd, filePath)));
  const changedAfterWrite = await filterActuallyChangedFiles(cwd, changedFiles, beforeContents);

  if (changedAfterWrite.length === 0) {
    throw new Error('No version change was applied.');
  }

  const changedAfterCommands = await new PreCommitCommandsRunner(cwd).run(config.preCommitCommands, baselineChangedFiles);
  if (changedAfterCommands.length === 0) {
    throw new Error('No version change was applied.');
  }

  const templateValues = { bump: config.bump.value, currentVersion: currentVersionText, nextVersion: nextVersionText };
  const commit = Commit.create(renderer.render(config.commitMessage, templateValues));
  const pullRequestRequest = PullRequest.create(
    baseBranch,
    branch,
    config.draft,
    renderer.render(config.prTitle, templateValues),
    renderer.render(config.prBody, templateValues),
    tag,
  );

  await commitAndPush(branch.name, changedAfterCommands, commit.message, remoteBranchSha);
  const pullRequest = await createPullRequest(octokit, {
    baseBranch: pullRequestRequest.baseBranch.name,
    branch: pullRequestRequest.headBranch.name,
    draft: pullRequestRequest.draft,
    githubToken: config.githubToken,
    prBody: pullRequestRequest.body,
    prTitle: pullRequestRequest.title,
    tag: pullRequestRequest.tag.name,
  });

  return {
    branch: branch.name,
    changedFiles: changedAfterCommands.join('\n'),
    currentVersion: currentVersionText,
    nextVersion: nextVersionText,
    prUrl: pullRequest.url,
    tag: tag.name,
  };
}

async function snapshotFiles(cwd: string, files: string[]): Promise<Map<string, string | undefined>> {
  const snapshots = new Map<string, string | undefined>();
  for (const filePath of files) {
    const gitPath = toGitPath(cwd, filePath);
    try {
      snapshots.set(gitPath, await fs.readFile(path.resolve(cwd, gitPath), 'utf8'));
    } catch {
      snapshots.set(gitPath, undefined);
    }
  }
  return snapshots;
}

async function filterActuallyChangedFiles(cwd: string, files: string[], beforeContents: Map<string, string | undefined>): Promise<string[]> {
  const changedFiles: string[] = [];
  for (const filePath of files) {
    const gitPath = toGitPath(cwd, filePath);
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

function potentialChangedFiles(versionFile: string): string[] {
  if (path.basename(versionFile) !== 'package.json') {
    return [versionFile];
  }

  return [versionFile, path.join(path.dirname(versionFile), 'package-lock.json')];
}
