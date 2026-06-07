import fs from 'node:fs/promises';
import path from 'node:path';
import type { VersionStrategy } from '../../domain/versioning/version-strategy';

export class RegexStrategy implements VersionStrategy {
  private readonly filePath: string;
  private readonly pattern: RegExp;
  private readonly replacement: string;

  constructor(cwd: string, versionFile: string, versionPattern: string, versionReplacement: string) {
    this.filePath = path.resolve(cwd, versionFile);
    this.pattern = new RegExp(versionPattern, 'm');
    this.replacement = versionReplacement;
  }

  getPotentialChangedFiles(): string[] {
    return [this.filePath];
  }

  async readCurrentVersion(): Promise<string> {
    const content = await fs.readFile(this.filePath, 'utf8');
    const match = this.pattern.exec(content);

    if (!match) {
      throw new Error(`Could not match version-pattern in ${this.filePath}.`);
    }
    if (match.length !== 2) {
      throw new Error(`version-pattern must contain exactly one capture group. Found ${match.length - 1}.`);
    }

    return match[1];
  }

  async writeNextVersion(nextVersion: string): Promise<string[]> {
    const original = await fs.readFile(this.filePath, 'utf8');
    let replacementCount = 0;
    const updated = original.replace(this.pattern, () => {
      replacementCount += 1;
      return this.replacement.replaceAll('{version}', nextVersion);
    });

    if (replacementCount !== 1) {
      throw new Error(`Expected to update exactly one regex match in ${this.filePath}, updated ${replacementCount}.`);
    }

    await fs.writeFile(this.filePath, updated, 'utf8');
    return [this.filePath];
  }
}
