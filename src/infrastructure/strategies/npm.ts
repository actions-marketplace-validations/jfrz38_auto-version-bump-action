import * as exec from '@actions/exec';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { VersionStrategy } from '../../domain/version-strategy';

interface PackageJson {
  version?: unknown;
  [key: string]: unknown;
}

export class NpmStrategy implements VersionStrategy {
  private readonly filePath: string;

  constructor(private readonly cwd: string, versionFile: string) {
    this.filePath = path.resolve(cwd, versionFile);
  }

  async readCurrentVersion(): Promise<string> {
    const packageJson = await this.readPackageJson();
    if (typeof packageJson.version !== 'string') {
      throw new Error(`Could not resolve a string version from ${this.filePath}.`);
    }

    return packageJson.version;
  }

  async writeNextVersion(nextVersion: string): Promise<string[]> {
    if (path.basename(this.filePath) !== 'package.json') {
      throw new Error('strategy=npm requires version-file to point to package.json.');
    }

    const packageDir = path.dirname(this.filePath);
    const packageLockPath = path.join(packageDir, 'package-lock.json');
    const hasPackageLock = await fileExists(packageLockPath);

    if (hasPackageLock) {
      await exec.exec('npm', ['version', nextVersion, '--no-git-tag-version', '--allow-same-version'], { cwd: packageDir });
      const changedFiles = [this.filePath];
      if (await fileExists(packageLockPath)) {
        changedFiles.push(packageLockPath);
      }
      return changedFiles;
    }

    const packageJson = await this.readPackageJson();
    packageJson.version = nextVersion;
    await fs.writeFile(this.filePath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
    return [this.filePath];
  }

  private async readPackageJson(): Promise<PackageJson> {
    const raw = await fs.readFile(this.filePath, 'utf8');
    try {
      return JSON.parse(raw) as PackageJson;
    } catch (error) {
      throw new Error(`Could not parse ${this.filePath} as JSON: ${error instanceof Error ? error.message : String(error)}`, {
        cause: error,
      });
    }
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
