export interface VersionStrategy {
  getPotentialChangedFiles(): string[];
  readCurrentVersion(): Promise<string>;
  writeNextVersion(nextVersion: string): Promise<string[]>;
}
