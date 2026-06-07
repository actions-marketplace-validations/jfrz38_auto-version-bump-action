import fs from 'node:fs/promises';
import path from 'node:path';
import type { VersionStrategy } from '../../domain/versioning/version-strategy';

const VERSION_ASSIGNMENT_PATTERN = /(^\s*version\s*=\s*")(\d+\.\d+\.\d+)(".*$)/gm;

export class GradleKtsStrategy implements VersionStrategy {
  private readonly filePath: string;

  constructor(cwd: string, versionFile: string) {
    this.filePath = path.resolve(cwd, versionFile);
  }

  getPotentialChangedFiles(): string[] {
    return [this.filePath];
  }

  async readCurrentVersion(): Promise<string> {
    const content = await fs.readFile(this.filePath, 'utf8');
    const matches = [...content.matchAll(VERSION_ASSIGNMENT_PATTERN)];

    if (matches.length === 0) {
      throw new Error(`Could not resolve a version assignment from ${this.filePath}. Expected version = "MAJOR.MINOR.PATCH".`);
    }
    if (matches.length > 1) {
      throw new Error(`Found multiple version assignments in ${this.filePath}. Refusing to choose one.`);
    }

    return matches[0][2];
  }

  async writeNextVersion(nextVersion: string): Promise<string[]> {
    const original = await fs.readFile(this.filePath, 'utf8');
    let replacementCount = 0;
    const updated = original.replace(VERSION_ASSIGNMENT_PATTERN, (_match, prefix: string, _version: string, suffix: string) => {
      replacementCount += 1;
      return `${prefix}${nextVersion}${suffix}`;
    });

    if (replacementCount !== 1) {
      throw new Error(`Expected to update exactly one version assignment in ${this.filePath}, updated ${replacementCount}.`);
    }

    await fs.writeFile(this.filePath, updated, 'utf8');
    return [this.filePath];
  }
}
