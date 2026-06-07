import { SimpleVersion } from '../versioning/simple-version';

export class Tag {
  private constructor(readonly name: string) {
    if (!name.trim()) {
      throw new Error('Tag name must not be empty.');
    }
  }

  static forVersion(prefix: string, version: SimpleVersion): Tag {
    return new Tag(`${prefix}${version.toString()}`);
  }

  toString(): string {
    return this.name;
  }
}
