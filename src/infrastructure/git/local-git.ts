import * as exec from '@actions/exec';
import type { GitRepository } from '../../domain/ports/git-repository';
import { GitStatus } from './git-status';

const GIT_COMMAND = 'git';

export class LocalGitRepository implements GitRepository {
  async checkoutBumpBranch(baseBranch: string, branch: string): Promise<void> {
    await git(['fetch', 'origin', baseBranch, '--depth=1']);
    await git(['checkout', '-B', branch, `origin/${baseBranch}`]);
  }

  async getChangedFiles(): Promise<string[]> {
    const status = await gitOutput(['status', '--porcelain', '--untracked-files=all', '-z']);
    return GitStatus.fromPorcelain(status).changedFiles;
  }
}

async function git(args: string[]): Promise<void> {
  await exec.exec(GIT_COMMAND, args);
}

async function gitOutput(args: string[]): Promise<string> {
  const result = await exec.getExecOutput(GIT_COMMAND, args, { ignoreReturnCode: false });
  return result.stdout;
}
