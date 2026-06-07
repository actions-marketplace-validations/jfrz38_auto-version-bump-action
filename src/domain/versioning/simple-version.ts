import { type BumpValue } from './bump';

const SIMPLE_SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)$/;
const PATCH = 'patch';
const MINOR = 'minor';
const MAJOR = 'major';

export class SimpleVersion {
  private constructor(
    private readonly major: number,
    private readonly minor: number,
    private readonly patch: number,
  ) {}

  static parse(version: string): SimpleVersion {
    const match = SIMPLE_SEMVER_PATTERN.exec(version.trim());
    if (!match) {
      throw new Error(`Invalid SemVer version "${version}". Expected MAJOR.MINOR.PATCH.`);
    }

    return new SimpleVersion(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  bump(component: BumpValue): SimpleVersion {
    if (component === PATCH) {
      return new SimpleVersion(this.major, this.minor, this.patch + 1);
    }

    if (component === MINOR) {
      return new SimpleVersion(this.major, this.minor + 1, 0);
    }

    if (component === MAJOR) {
      return new SimpleVersion(this.major + 1, 0, 0);
    }

    throw new Error(`Unsupported bump component "${component}".`);
  }

  toString(): string {
    return `${this.major}.${this.minor}.${this.patch}`;
  }
}
