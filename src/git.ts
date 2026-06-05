import * as exec from '@actions/exec';
import { GitStatus } from './git-status';

export async function checkoutBumpBranch(baseBranch: string, branch: string): Promise<void> {
  await git(['fetch', 'origin', baseBranch, '--depth=1']);
  await git(['checkout', '-B', branch, `origin/${baseBranch}`]);
}

export async function getRemoteBranchSha(branch: string): Promise<string | undefined> {
  const result = await exec.getExecOutput('git', ['ls-remote', '--heads', 'origin', branch], { ignoreReturnCode: true });
  if (result.exitCode !== 0) {
    return undefined;
  }

  const [sha] = result.stdout.trim().split(/\s+/);
  return sha || undefined;
}

export async function commitAndPush(branch: string, changedFiles: string[], commitMessage: string, remoteBranchSha?: string): Promise<void> {
  await git(['config', 'user.name', 'github-actions[bot]']);
  await git(['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
  await git(['add', ...changedFiles]);

  const status = await gitOutput(['status', '--porcelain', '--', ...changedFiles]);
  if (!status.trim()) {
    throw new Error('No version change was applied.');
  }

  await git(['commit', '-m', commitMessage]);
  if (remoteBranchSha) {
    await git(['push', `--force-with-lease=refs/heads/${branch}:${remoteBranchSha}`, '--set-upstream', 'origin', branch]);
    return;
  }

  await git(['push', '--set-upstream', 'origin', branch]);
}

export async function getChangedFiles(): Promise<string[]> {
  const status = await gitOutput(['status', '--porcelain', '--untracked-files=all', '-z']);
  return GitStatus.fromPorcelain(status).changedFiles;
}

async function git(args: string[]): Promise<void> {
  await exec.exec('git', args);
}

async function gitOutput(args: string[]): Promise<string> {
  const result = await exec.getExecOutput('git', args, { ignoreReturnCode: false });
  return result.stdout;
}
