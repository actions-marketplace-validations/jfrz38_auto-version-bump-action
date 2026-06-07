import path from 'node:path';
import type { GitPathResolver } from '../../domain/ports/git-path-resolver';

export class NodeGitPathResolver implements GitPathResolver {
  toGitPath(cwd: string, filePath: string): string {
    const relativePath = path.isAbsolute(filePath) ? path.relative(cwd, filePath) : filePath;
    return relativePath.split(path.sep).join('/');
  }
}
