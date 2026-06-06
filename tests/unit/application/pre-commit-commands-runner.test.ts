import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PreCommitCommandsRunner } from '../../../src/application/pre-commit-commands-runner';
import { PreCommitCommands } from '../../../src/domain/pre-commit-commands';

const execMock = vi.hoisted(() => ({
  exec: vi.fn(),
  getExecOutput: vi.fn(),
}));

vi.mock('@actions/exec', () => execMock);

describe('PreCommitCommandsRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs commands in order and returns changed files excluding the baseline', async () => {
    execMock.exec.mockResolvedValue(0);
    execMock.getExecOutput.mockResolvedValue({ stdout: ' M build.gradle.kts\0 M dist/index.js\0', stderr: '', exitCode: 0 });

    const changedFiles = await new PreCommitCommandsRunner('/workspace').run(
      PreCommitCommands.fromInput('pnpm install\npnpm run build'),
      ['build.gradle.kts'],
    );

    expect(execMock.exec).toHaveBeenNthCalledWith(1, 'pnpm install', [], { cwd: '/workspace' });
    expect(execMock.exec).toHaveBeenNthCalledWith(2, 'pnpm run build', [], { cwd: '/workspace' });
    expect(changedFiles).toEqual(['dist/index.js']);
  });

  it('can run corepack setup before pnpm commands', async () => {
    execMock.exec.mockResolvedValue(0);
    execMock.getExecOutput.mockResolvedValue({ stdout: ' M package.json\0 M dist/index.js\0', stderr: '', exitCode: 0 });

    const changedFiles = await new PreCommitCommandsRunner('/workspace').run(
      PreCommitCommands.fromInput('corepack enable\npnpm install --frozen-lockfile\nmake package-github-action'),
      ['package.json'],
    );

    expect(execMock.exec).toHaveBeenNthCalledWith(1, 'corepack enable', [], { cwd: '/workspace' });
    expect(execMock.exec).toHaveBeenNthCalledWith(2, 'pnpm install --frozen-lockfile', [], { cwd: '/workspace' });
    expect(execMock.exec).toHaveBeenNthCalledWith(3, 'make package-github-action', [], { cwd: '/workspace' });
    expect(changedFiles).toEqual(['dist/index.js']);
  });
});
