import { describe, expect, it } from 'vitest';
import { Commit } from '../../../src/domain/release-proposal/commit';

describe('Commit', () => {
  it('builds commits from rendered messages', () => {
    const commit = Commit.create('Bump version to 1.2.4');

    expect(commit.message).toBe('Bump version to 1.2.4');
  });

  it('rejects blank messages', () => {
    expect(() => Commit.create('')).toThrow('Commit message must not be empty');
  });
});
