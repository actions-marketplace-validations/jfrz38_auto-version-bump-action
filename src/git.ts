import * as exec from '@actions/exec';
import { GitStatus } from './git-status';

export async function checkoutBumpBranch(baseBranch: string, branch: string): Promise<void> {
  await git(['fetch', 'origin', baseBranch, '--depth=1']);
  await git(['checkout', '-B', branch, `origin/${baseBranch}`]);
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
