import type { Branch } from './branch';
import type { Tag } from './tag';

export class PullRequest {
  private constructor(
    readonly baseBranch: Branch,
    readonly headBranch: Branch,
    readonly draft: boolean,
    readonly title: string,
    readonly body: string,
    readonly tag: Tag,
  ) {
    if (!title.trim()) {
      throw new Error('Pull request title must not be empty.');
    }
  }

  static create(baseBranch: Branch, headBranch: Branch, draft: boolean, title: string, body: string, tag: Tag): PullRequest {
    return new PullRequest(baseBranch, headBranch, draft, title, body, tag);
  }
}
