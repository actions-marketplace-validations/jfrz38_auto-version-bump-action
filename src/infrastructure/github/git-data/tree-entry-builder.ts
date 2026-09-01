import fs from 'node:fs/promises';
import path from 'node:path';
import type { Octokit } from '../client';
import { isFileNotFound } from '../errors';
import { BASE64_ENCODING, BLOB_TYPE, FILE_MODE } from './git-data-constants';

export type TreeEntry = {
  mode: typeof FILE_MODE;
  path: string;
  sha: string | null;
  type: typeof BLOB_TYPE;
};

export async function createTreeEntries(octokit: Octokit, owner: string, repo: string, cwd: string, changedFiles: string[]): Promise<TreeEntry[]> {
  const tree: TreeEntry[] = [];

  for (const filePath of changedFiles) {
    const fullPath = path.resolve(cwd, filePath);
    try {
      const content = await fs.readFile(fullPath, BASE64_ENCODING);
      const blob = await octokit.rest.git.createBlob({ owner, repo, content, encoding: BASE64_ENCODING });
      tree.push({ path: filePath, mode: FILE_MODE, type: BLOB_TYPE, sha: blob.data.sha });
    } catch (error) {
      if (!isFileNotFound(error)) {
        throw error;
      }
      tree.push({ path: filePath, mode: FILE_MODE, type: BLOB_TYPE, sha: null });
    }
  }

  return tree;
}
