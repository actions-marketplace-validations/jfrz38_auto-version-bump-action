import { SimpleVersion } from '../versioning/simple-version';

export class Branch {
  private constructor(readonly name: string) {
    if (!name.trim()) {
      throw new Error('Branch name must not be empty.');
    }
  }

  static fromName(name: string): Branch {
    return new Branch(name);
  }

  static forVersion(prefix: string, version: SimpleVersion): Branch {
    return new Branch(`${prefix}${version.toString()}`);
  }

  assertCanUseRemoteState(remoteBranchSha: string | undefined, overwriteExistingBranch: boolean): void {
    if (remoteBranchSha && !overwriteExistingBranch) {
      throw new Error(
        `Branch ${this.name} already exists on origin, but no open pull request was found for it. Delete the branch, use a different branch-prefix, or set overwrite-existing-branch to true.`,
      );
    }
  }

  toString(): string {
    return this.name;
  }
}
