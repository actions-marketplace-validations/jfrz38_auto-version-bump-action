import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const coreMock = vi.hoisted(() => ({
  getInput: vi.fn(),
  setFailed: vi.fn(),
  setOutput: vi.fn(),
}));

const execMock = vi.hoisted(() => ({
  exec: vi.fn(),
  getExecOutput: vi.fn(),
}));

const githubMock = vi.hoisted(() => ({
  context: {
    repo: { owner: 'jfrz38', repo: 'demo' },
    payload: {
      repository: {
        default_branch: 'main',
      },
    },
  },
  getOctokit: vi.fn(),
}));

vi.mock('@actions/core', () => coreMock);
vi.mock('@actions/exec', () => execMock);
vi.mock('@actions/github', () => githubMock);

describe('main action entrypoint', () => {
  let tempDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'version-bump-action-main-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
    fs.writeFileSync(path.join(tempDir, 'build.gradle.kts'), 'version = "1.2.3"\n');

    vi.resetModules();
    vi.clearAllMocks();

    githubMock.getOctokit.mockReturnValue({
      rest: {
        git: {
          createBlob: vi.fn().mockResolvedValue({ data: { sha: 'blob-sha' } }),
          createCommit: vi.fn().mockResolvedValue({ data: { sha: 'commit-sha' } }),
          createRef: vi.fn().mockResolvedValue({ data: { ref: 'refs/heads/chore/bump-version-1.2.4' } }),
          createTree: vi.fn().mockResolvedValue({ data: { sha: 'tree-sha' } }),
          getCommit: vi.fn().mockResolvedValue({ data: { tree: { sha: 'base-tree-sha' } } }),
          getRef: vi.fn().mockImplementation(({ ref }: { ref: string }) => {
            if (ref === 'heads/develop') {
              return Promise.resolve({ data: { object: { sha: 'base-commit-sha' } } });
            }

            return Promise.reject({ status: 404 });
          }),
          updateRef: vi.fn().mockResolvedValue({ data: { ref: 'refs/heads/chore/bump-version-1.2.4' } }),
        },
        pulls: {
          create: vi.fn().mockResolvedValue({ data: { html_url: 'https://github.com/jfrz38/demo/pull/1' } }),
          list: vi.fn().mockResolvedValue({ data: [] }),
        },
        repos: { getReleaseByTag: vi.fn().mockRejectedValue({ status: 404 }) },
      },
    });
    execMock.exec.mockResolvedValue(0);
    let statusCalls = 0;
    execMock.getExecOutput.mockImplementation((_command: string, args: string[]) => {
      if (args[0] === 'status') {
        statusCalls += 1;
        if (statusCalls === 1) {
          return Promise.resolve({ stdout: '', stderr: '', exitCode: 0 });
        }

        return Promise.resolve({ stdout: ' M build.gradle.kts\0', stderr: '', exitCode: 0 });
      }

      return Promise.resolve({ stdout: '', stderr: '', exitCode: 0 });
    });

    coreMock.getInput.mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        bump: 'patch',
        strategy: 'gradle-kts',
        'version-file': 'build.gradle.kts',
        'version-pattern': '',
        'version-replacement': '',
        'base-branch': 'develop',
        'branch-prefix': 'chore/bump-version-',
        'tag-prefix': 'v',
        draft: 'true',
        'github-token': 'token',
        'commit-message': 'Bump version to {version}',
        'pre-commit-commands': '',
        'pr-title': 'Bump version to {version}',
        'pr-body': 'Bumps version from {current-version} to {next-version} using a {bump} release bump.',
        'fail-if-tag-exists': 'true',
        'fail-if-release-exists': 'true',
        'overwrite-existing-branch': 'false',
      };
      return inputs[name] ?? '';
    });
  });

  afterEach(() => {
    cwdSpy.mockRestore();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('reads action inputs and writes action outputs', async () => {
    const { run } = await import('../../src/main');

    const result = await run();

    expect(result.nextVersion).toBe('1.2.4');
    expect(coreMock.setOutput).toHaveBeenCalledWith('next-version', '1.2.4');
    expect(coreMock.setOutput).toHaveBeenCalledWith('pr-url', 'https://github.com/jfrz38/demo/pull/1');
  });
});
