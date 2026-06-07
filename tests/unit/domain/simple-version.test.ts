import { describe, expect, it } from 'vitest';
import { Bump } from '../../../src/domain/versioning/bump';
import { SimpleVersion } from '../../../src/domain/versioning/simple-version';

describe('SimpleVersion', () => {
  it('bumps simple versions', () => {
    expect(SimpleVersion.parse('1.2.3').bump('patch').toString()).toBe('1.2.4');
    expect(SimpleVersion.parse('1.2.3').bump('minor').toString()).toBe('1.3.0');
    expect(SimpleVersion.parse('1.2.3').bump('major').toString()).toBe('2.0.0');
  });

  it('rejects invalid versions', () => {
    expect(() => SimpleVersion.parse('1.2')).toThrow('Invalid SemVer');
    expect(() => SimpleVersion.parse('1.2.3-beta.1')).toThrow('Invalid SemVer');
  });

  it('validates bump values', () => {
    expect(Bump.fromInput('MINOR').value).toBe('minor');
    expect(() => Bump.fromInput('release')).toThrow('Invalid bump');
  });
});
