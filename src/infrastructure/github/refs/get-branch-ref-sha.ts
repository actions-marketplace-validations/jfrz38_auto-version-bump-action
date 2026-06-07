import type { Octokit } from '../client';
import { ensureRepositoryContext } from '../context';
import { isNotFound } from '../errors';
import { HEADS_REF_PREFIX } from '../git-data/git-data-constants';

export async function getBranchRefSha(octokit: Octokit, branch: string): Promise<string | undefined> {
  const { owner, repo } = ensureRepositoryContext();

  try {
    const response = await octokit.rest.git.getRef({ owner, repo, ref: `${HEADS_REF_PREFIX}${branch}` });
    return response.data.object.sha;
  } catch (error) {
    if (isNotFound(error)) {
      return undefined;
    }
    throw error;
  }
}
