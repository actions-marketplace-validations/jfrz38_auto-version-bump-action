export interface GitPathResolver {
  toGitPath(cwd: string, filePath: string): string;
}
