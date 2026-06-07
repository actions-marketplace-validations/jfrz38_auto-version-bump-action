import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PreCommitCommandsRunner } from '../../../src/application/pre-commit-commands-runner';
import { PreCommitCommands } from '../../../src/domain/config/pre-commit-commands';
import type { CommandExecutor } from '../../../src/domain/ports/command-executor';
import type { GitRepository } from '../../../src/domain/ports/git-repository';

describe('PreCommitCommandsRunner', () => {
  let commandExecutor: MockCommandExecutor;
  let gitRepository: MockGitRepository;

  beforeEach(() => {
    commandExecutor = new MockCommandExecutor();
    gitRepository = new MockGitRepository();
  });

  it('runs commands in order and returns changed files excluding the baseline', async () => {
    gitRepository.changedFiles = ['build.gradle.kts', 'dist/index.js'];

    const changedFiles = await new PreCommitCommandsRunner(commandExecutor, gitRepository).run(
      '/workspace',
      PreCommitCommands.fromInput('pnpm install\npnpm run build'),
      ['build.gradle.kts'],
    );

    expect(commandExecutor.exec).toHaveBeenNthCalledWith(1, 'pnpm install', [], { cwd: '/workspace' });
    expect(commandExecutor.exec).toHaveBeenNthCalledWith(2, 'pnpm run build', [], { cwd: '/workspace' });
    expect(changedFiles).toEqual(['dist/index.js']);
  });

  it('can run corepack setup before pnpm commands', async () => {
    gitRepository.changedFiles = ['package.json', 'dist/index.js'];

    const changedFiles = await new PreCommitCommandsRunner(commandExecutor, gitRepository).run(
      '/workspace',
      PreCommitCommands.fromInput('corepack enable\npnpm install --frozen-lockfile\nmake package-github-action'),
      ['package.json'],
    );

    expect(commandExecutor.exec).toHaveBeenNthCalledWith(1, 'corepack enable', [], { cwd: '/workspace' });
    expect(commandExecutor.exec).toHaveBeenNthCalledWith(2, 'pnpm install --frozen-lockfile', [], { cwd: '/workspace' });
    expect(commandExecutor.exec).toHaveBeenNthCalledWith(3, 'make package-github-action', [], { cwd: '/workspace' });
    expect(changedFiles).toEqual(['dist/index.js']);
  });
});

class MockCommandExecutor implements CommandExecutor {
  readonly exec = vi.fn<CommandExecutor['exec']>().mockResolvedValue(undefined);
}

class MockGitRepository implements GitRepository {
  changedFiles: string[] = [];
  readonly checkoutBumpBranch = vi.fn<GitRepository['checkoutBumpBranch']>().mockResolvedValue(undefined);
  readonly getChangedFiles = vi.fn<GitRepository['getChangedFiles']>(() => Promise.resolve(this.changedFiles));
}
