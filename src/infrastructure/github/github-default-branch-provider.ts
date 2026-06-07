import * as github from '@actions/github';
import type { DefaultBranchProvider } from '../../domain/ports/default-branch-provider';

export class GitHubDefaultBranchProvider implements DefaultBranchProvider {
  getDefaultBranch(): string {
    const repository = github.context.payload.repository;
    const defaultBranch = typeof repository?.default_branch === 'string' ? repository.default_branch : '';
    if (defaultBranch) {
      return defaultBranch;
    }

    return process.env.GITHUB_REF_NAME ?? '';
  }
}
