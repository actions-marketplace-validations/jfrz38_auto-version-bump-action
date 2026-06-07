import type { Octokit } from '../client';
import { ensureRepositoryContext } from '../context';
import { isNotFound } from '../errors';

const TAGS_REF_PREFIX = 'tags/';

export async function assertTagDoesNotExist(octokit: Octokit, tag: string): Promise<void> {
  const { owner, repo } = ensureRepositoryContext();

  try {
    await octokit.rest.git.getRef({ owner, repo, ref: `${TAGS_REF_PREFIX}${tag}` });
  } catch (error) {
    if (isNotFound(error)) {
      return;
    }
    throw error;
  }

  throw new Error(`Tag ${tag} already exists.`);
}
