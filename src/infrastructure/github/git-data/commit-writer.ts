import type { CreateCommitOnBranchOptions } from '../../../domain/ports/github-repository';
import type { Octokit } from '../client';
import { ensureRepositoryContext } from '../context';
import { HEADS_REF_PREFIX, REFS_HEADS_PREFIX } from './git-data-constants';
import { createTreeEntries } from './tree-entry-builder';

export async function createCommitOnBranch(octokit: Octokit, options: CreateCommitOnBranchOptions): Promise<void> {
  const { owner, repo } = ensureRepositoryContext();
  const baseRef = await octokit.rest.git.getRef({ owner, repo, ref: `${HEADS_REF_PREFIX}${options.baseBranch}` });
  const baseCommitSha = baseRef.data.object.sha;
  const baseCommit = await octokit.rest.git.getCommit({ owner, repo, commit_sha: baseCommitSha });
  const tree = await createTreeEntries(octokit, owner, repo, options.cwd, options.changedFiles);

  const newTree = await octokit.rest.git.createTree({ owner, repo, base_tree: baseCommit.data.tree.sha, tree });
  const commit = await octokit.rest.git.createCommit({
    owner,
    repo,
    message: options.commitMessage,
    tree: newTree.data.sha,
    parents: [baseCommitSha],
  });

  if (options.remoteBranchSha) {
    await octokit.rest.git.updateRef({ owner, repo, ref: `${HEADS_REF_PREFIX}${options.branch}`, sha: commit.data.sha, force: true });
    return;
  }

  await octokit.rest.git.createRef({ owner, repo, ref: `${REFS_HEADS_PREFIX}${options.branch}`, sha: commit.data.sha });
}
