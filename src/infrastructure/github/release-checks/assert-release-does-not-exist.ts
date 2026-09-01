import type { Octokit } from '../client';
import { ensureRepositoryContext } from '../context';
import { isNotFound } from '../errors';

export async function assertReleaseDoesNotExist(octokit: Octokit, tag: string): Promise<void> {
  const { owner, repo } = ensureRepositoryContext();

  try {
    await octokit.rest.repos.getReleaseByTag({ owner, repo, tag });
  } catch (error) {
    if (isNotFound(error)) {
      return;
    }
    throw error;
  }

  throw new Error(`GitHub Release ${tag} already exists.`);
}
