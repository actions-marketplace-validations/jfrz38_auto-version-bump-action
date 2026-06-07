export type BumpValue = 'patch' | 'minor' | 'major';

const PATCH = 'patch';
const MINOR = 'minor';
const MAJOR = 'major';
const BUMP_VALUES = new Set<string>([PATCH, MINOR, MAJOR]);

export class Bump {
  private constructor(readonly value: BumpValue) {}

  static fromInput(value: string): Bump {
    const normalized = value.trim().toLowerCase();
    if (BUMP_VALUES.has(normalized)) {
      return new Bump(normalized as BumpValue);
    }

    throw new Error(`Invalid bump "${value}". Expected patch, minor, or major.`);
  }
}
