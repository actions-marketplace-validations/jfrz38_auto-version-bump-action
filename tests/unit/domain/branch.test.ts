import { describe, expect, it } from 'vitest';
import { Branch } from '../../../src/domain/release-proposal/branch';
import { SimpleVersion } from '../../../src/domain/versioning/simple-version';

describe('Branch', () => {
  it('builds branch names from existing branch names', () => {
    const branch = Branch.fromName('main');

    expect(branch.name).toBe('main');
    expect(branch.toString()).toBe('main');
  });

  it('builds version bump branch names', () => {
    const branch = Branch.forVersion('chore/bump-version-', SimpleVersion.parse('1.2.4'));

    expect(branch.name).toBe('chore/bump-version-1.2.4');
    expect(branch.toString()).toBe('chore/bump-version-1.2.4');
  });

  it('guards existing remote branches unless overwriting is explicitly enabled', () => {
    const branch = Branch.forVersion('chore/bump-version-', SimpleVersion.parse('1.2.4'));

    expect(() => branch.assertCanUseRemoteState('abc123', false)).toThrow(
      'Branch chore/bump-version-1.2.4 already exists on origin',
    );
    expect(() => branch.assertCanUseRemoteState('abc123', true)).not.toThrow();
    expect(() => branch.assertCanUseRemoteState(undefined, false)).not.toThrow();
  });
});
