import { describe, expect, it } from 'vitest';
import { Branch } from '../../../src/domain/release-proposal/branch';
import { PullRequest } from '../../../src/domain/release-proposal/pull-request';
import { Tag } from '../../../src/domain/release-proposal/tag';
import { SimpleVersion } from '../../../src/domain/versioning/simple-version';

describe('PullRequest', () => {
  it('builds pull requests from rendered content', () => {
    const baseBranch = Branch.fromName('main');
    const headBranch = Branch.forVersion('chore/bump-version-', SimpleVersion.parse('1.2.4'));
    const tag = Tag.forVersion('v', SimpleVersion.parse('1.2.4'));
    const pullRequest = PullRequest.create(
      baseBranch,
      headBranch,
      true,
      'Bump version to 1.2.4',
      'Bumps version from 1.2.3 to 1.2.4 using a patch release bump.',
      tag,
    );

    expect(pullRequest.baseBranch).toBe(baseBranch);
    expect(pullRequest.headBranch).toBe(headBranch);
    expect(pullRequest.draft).toBe(true);
    expect(pullRequest.title).toBe('Bump version to 1.2.4');
    expect(pullRequest.body).toBe('Bumps version from 1.2.3 to 1.2.4 using a patch release bump.');
    expect(pullRequest.tag).toBe(tag);
  });

  it('rejects blank titles', () => {
    const baseBranch = Branch.fromName('main');
    const headBranch = Branch.forVersion('chore/bump-version-', SimpleVersion.parse('1.2.4'));
    const tag = Tag.forVersion('v', SimpleVersion.parse('1.2.4'));

    expect(() => PullRequest.create(baseBranch, headBranch, true, '', 'Body', tag)).toThrow('title must not be empty');
  });
});
