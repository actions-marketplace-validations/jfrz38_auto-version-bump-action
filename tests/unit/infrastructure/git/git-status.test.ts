import { describe, expect, it } from 'vitest';
import { GitStatus } from '../../../../src/infrastructure/git/git-status';

describe('GitStatus', () => {
  it('returns no changed files for empty status', () => {
    expect(GitStatus.fromPorcelain('').changedFiles).toEqual([]);
  });

  it('parses modified files', () => {
    expect(GitStatus.fromPorcelain(' M src/main.ts\0').changedFiles).toEqual(['src/main.ts']);
  });

  it('parses untracked files', () => {
    expect(GitStatus.fromPorcelain('?? new-file.ts\0').changedFiles).toEqual(['new-file.ts']);
  });

  it('parses multiple changed files', () => {
    expect(GitStatus.fromPorcelain(' M src/main.ts\0A  src/new.ts\0 D src/old.ts\0').changedFiles).toEqual([
      'src/main.ts',
      'src/new.ts',
      'src/old.ts',
    ]);
  });

  it('skips the source path entry for renames', () => {
    expect(GitStatus.fromPorcelain('R  src/new.ts\0src/old.ts\0').changedFiles).toEqual(['src/new.ts']);
  });

  it('skips the source path entry for copies', () => {
    expect(GitStatus.fromPorcelain('C  src/copy.ts\0src/source.ts\0').changedFiles).toEqual(['src/copy.ts']);
  });
});
