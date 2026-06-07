import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalGitRepository } from '../../../../src/infrastructure/git/local-git';

const execMock = vi.hoisted(() => ({
  exec: vi.fn(),
  getExecOutput: vi.fn(),
}));

vi.mock('@actions/exec', () => execMock);

describe('LocalGitRepository', () => {
  let repository: LocalGitRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    execMock.exec.mockResolvedValue(0);
    execMock.getExecOutput.mockResolvedValue({ stdout: ' M build.gradle.kts\0?? dist/index.js\0', stderr: '', exitCode: 0 });
    repository = new LocalGitRepository();
  });

  it('checks out the bump branch from the remote base branch', async () => {
    await repository.checkoutBumpBranch('develop', 'chore/bump-version-1.2.4');

    expect(execMock.exec).toHaveBeenCalledWith('git', ['fetch', 'origin', 'develop', '--depth=1']);
    expect(execMock.exec).toHaveBeenCalledWith('git', ['checkout', '-B', 'chore/bump-version-1.2.4', 'origin/develop']);
  });

  it('reads changed files from git status porcelain output', async () => {
    await expect(repository.getChangedFiles()).resolves.toEqual(['build.gradle.kts', 'dist/index.js']);

    expect(execMock.getExecOutput).toHaveBeenCalledWith('git', ['status', '--porcelain', '--untracked-files=all', '-z'], {
      ignoreReturnCode: false,
    });
  });
});
