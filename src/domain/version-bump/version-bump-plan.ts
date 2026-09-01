import type { Branch } from '../release-proposal/branch';
import type { Tag } from '../release-proposal/tag';
import type { SimpleVersion } from '../versioning/simple-version';

export class VersionBumpPlan {
  constructor(
    readonly currentVersion: SimpleVersion,
    readonly nextVersion: SimpleVersion,
    readonly baseBranch: Branch,
    readonly branch: Branch,
    readonly tag: Tag,
  ) {}

  get currentVersionText(): string {
    return this.currentVersion.toString();
  }

  get nextVersionText(): string {
    return this.nextVersion.toString();
  }
}
