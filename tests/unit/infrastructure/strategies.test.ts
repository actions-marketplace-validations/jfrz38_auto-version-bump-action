import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GradleKtsStrategy } from '../../../src/infrastructure/strategies/gradle-kts';
import { NpmStrategy } from '../../../src/infrastructure/strategies/npm';
import { RegexStrategy } from '../../../src/infrastructure/strategies/regex';

const execMock = vi.hoisted(() => ({
  exec: vi.fn(),
}));

vi.mock('@actions/exec', () => execMock);

describe('version strategies', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'version-bump-action-'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('reads and updates gradle-kts versions', async () => {
    const filePath = path.join(tempDir, 'build.gradle.kts');
    fs.writeFileSync(filePath, 'plugins {}\nversion = "0.1.2"\n');

    const strategy = new GradleKtsStrategy(tempDir, 'build.gradle.kts');

    expect(strategy.getPotentialChangedFiles()).toEqual([filePath]);
    expect(await strategy.readCurrentVersion()).toBe('0.1.2');
    expect(await strategy.writeNextVersion('0.1.3')).toEqual([filePath]);
    expect(fs.readFileSync(filePath, 'utf8')).toContain('version = "0.1.3"');
  });

  it('rejects ambiguous gradle-kts versions', async () => {
    fs.writeFileSync(path.join(tempDir, 'build.gradle.kts'), 'version = "0.1.2"\nversion = "0.1.3"\n');

    await expect(new GradleKtsStrategy(tempDir, 'build.gradle.kts').readCurrentVersion()).rejects.toThrow('multiple version assignments');
  });

  it('updates package.json directly when package-lock.json is absent', async () => {
    const filePath = path.join(tempDir, 'package.json');
    fs.writeFileSync(filePath, JSON.stringify({ name: 'demo', version: '1.2.3' }, null, 2));

    const strategy = new NpmStrategy(tempDir, 'package.json');

    expect(strategy.getPotentialChangedFiles()).toEqual([filePath, path.join(tempDir, 'package-lock.json')]);
    expect(await strategy.readCurrentVersion()).toBe('1.2.3');
    expect(await strategy.writeNextVersion('1.2.4')).toEqual([filePath]);
    expect(JSON.parse(fs.readFileSync(filePath, 'utf8'))).toMatchObject({ version: '1.2.4' });
    expect(execMock.exec).not.toHaveBeenCalled();
  });

  it('uses npm version when package-lock.json is present', async () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'demo', version: '1.2.3' }, null, 2));
    fs.writeFileSync(path.join(tempDir, 'package-lock.json'), JSON.stringify({ name: 'demo', version: '1.2.3' }, null, 2));

    const strategy = new NpmStrategy(tempDir, 'package.json');
    const changedFiles = await strategy.writeNextVersion('1.2.4');

    expect(execMock.exec).toHaveBeenCalledWith('npm', ['version', '1.2.4', '--no-git-tag-version', '--allow-same-version'], {
      cwd: tempDir,
    });
    expect(changedFiles).toEqual([path.join(tempDir, 'package.json'), path.join(tempDir, 'package-lock.json')]);
  });

  it('reads and updates versions with regex strategy', async () => {
    const filePath = path.join(tempDir, 'VERSION.txt');
    fs.writeFileSync(filePath, 'releaseVersion=1.2.3\n');

    const strategy = new RegexStrategy(tempDir, 'VERSION.txt', 'releaseVersion=(\\d+\\.\\d+\\.\\d+)', 'releaseVersion={version}');

    expect(strategy.getPotentialChangedFiles()).toEqual([filePath]);
    expect(await strategy.readCurrentVersion()).toBe('1.2.3');
    expect(await strategy.writeNextVersion('1.2.4')).toEqual([filePath]);
    expect(fs.readFileSync(filePath, 'utf8')).toBe('releaseVersion=1.2.4\n');
  });

  it('requires exactly one regex capture group', async () => {
    fs.writeFileSync(path.join(tempDir, 'VERSION.txt'), 'version=1.2.3\n');

    await expect(new RegexStrategy(tempDir, 'VERSION.txt', 'version=\\d+\\.\\d+\\.\\d+', 'version={version}').readCurrentVersion()).rejects.toThrow(
      'exactly one capture group',
    );
  });
});
