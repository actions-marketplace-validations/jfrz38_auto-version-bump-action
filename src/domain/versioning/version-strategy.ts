export interface VersionStrategy {
  readCurrentVersion(): Promise<string>;
  writeNextVersion(nextVersion: string): Promise<string[]>;
}
